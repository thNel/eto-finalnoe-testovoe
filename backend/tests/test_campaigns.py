import json
import unittest
from unittest.mock import patch

import httpx

from app.api.dependencies import get_keitaro
from app.config import Settings
from app.keitaro.client import KeitaroClient
from app.main import app


class FakeKeitaro:
    offer = {"id": 77, "name": "Demo offer", "state": "active"}

    def __init__(self):
        self.campaign = {}
        self.streams = []
        self.writes = []
        self.reject_offer_stream = False
        self.reject_verification = False
        self.timeout_after_enable = False

    def handle(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path.removeprefix("/admin_api/v1/")
        assert request.headers["Api-Key"] == "test-key"
        if request.method == "GET":
            resources = {
                "domains": [{"id": 1, "name": "tracker.example", "is_ssl": True, "state": "active"}],
                "groups": [{"id": 2, "name": "FORTESTS"}],
                "traffic_sources": [{"id": 3, "name": "FORTESTS", "state": "active"}],
                "offers": [self.offer],
                "offers/77": self.offer,
                "campaigns": [self.campaign] if self.campaign else [],
                "campaigns/123": self.campaign,
                "campaigns/123/streams": self.streams[:1] if self.reject_verification else self.streams,
            }
            return httpx.Response(200, json=resources[path])

        assert request.method == "POST"
        self.writes.append(path)
        if path == "campaigns":
            payload = json.loads(request.content)
            assert payload["state"] == "disabled"
            self.campaign = {"id": 123, **payload}
            return httpx.Response(200, json=self.campaign)
        if path == "streams":
            assert self.campaign["state"] == "disabled"
            payload = json.loads(request.content)
            if self.reject_offer_stream and payload["type"] == "default":
                return httpx.Response(422, json={"message": "Rejected test offer"})
            stream = {"id": 10 + len(self.streams), **payload}
            self.streams.append(stream)
            return httpx.Response(200, json=stream)

        assert path == "campaigns/123/enable"
        assert len(self.streams) == 2
        self.campaign["state"] = "active"
        if self.timeout_after_enable:
            raise httpx.ReadTimeout("Test timeout", request=request)
        return httpx.Response(200, json=self.campaign)


class CreateCampaignTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.keitaro = FakeKeitaro()
        upstream = httpx.AsyncClient(
            base_url="https://tracker.example/admin_api/v1/",
            transport=httpx.MockTransport(self.keitaro.handle),
        )
        self.addAsyncCleanup(upstream.aclose)
        client = KeitaroClient(upstream, "test-key")
        self.enterContext(patch.dict(app.dependency_overrides, {get_keitaro: lambda: client}))
        config = Settings(
            _env_file=None,
            keitaro_base_url="https://tracker.example",
            keitaro_domain="tracker.example",
            keitaro_campaign_group="FORTESTS",
            keitaro_traffic_source="FORTESTS",
        )
        self.enterContext(patch("app.api.campaigns.settings", config))
        self.enterContext(patch("app.api.schemas.settings", config))
        self.http = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")
        self.addAsyncCleanup(self.http.aclose)

    async def create(self, geo=None):
        return await self.http.post(
            "/api/v1/campaigns",
            json={"name": " Demo campaign ", "geo": ["pl", "AU", "PL"] if geo is None else geo, "offer_id": 77},
        )

    async def test_enables_campaign_after_saving_both_streams(self):
        response = await self.create()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["state"], "active")
        self.assertEqual(response.json()["name"], "Demo campaign")
        self.assertTrue(response.json()["tracking_url"].startswith("https://tracker.example/kt-"))
        self.assertEqual(self.keitaro.writes, ["campaigns", "streams", "streams", "campaigns/123/enable"])
        self.assertEqual(self.keitaro.streams[0]["filters"][0]["payload"], ["PL", "AU"])
        self.assertEqual(self.keitaro.streams[1]["offers"][0]["offer_id"], 77)

    async def test_reports_disabled_campaign_when_offer_stream_fails(self):
        self.keitaro.reject_offer_stream = True
        response = await self.create()
        self.assertEqual(response.status_code, 502)
        detail = response.json()["detail"]
        self.assertEqual((detail["campaign_id"], detail["campaign_state"], detail["step"]), (123, "disabled", "offer_stream"))
        self.assertNotIn("campaigns/123/enable", self.keitaro.writes)

    async def test_does_not_enable_unverified_campaign(self):
        self.keitaro.reject_verification = True
        response = await self.create()
        self.assertEqual(response.json()["detail"]["step"], "verify")
        self.assertNotIn("campaigns/123/enable", self.keitaro.writes)

    async def test_uses_readback_if_activation_times_out(self):
        self.keitaro.timeout_after_enable = True
        response = await self.create()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.keitaro.writes.count("campaigns/123/enable"), 1)

    async def test_rejects_unknown_geo_before_any_write(self):
        response = await self.create(["ZZ"])
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.keitaro.writes, [])
