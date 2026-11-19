import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx
from sqlalchemy import create_engine

from app.campaign_routes import get_keitaro
from app.db import Base
from app.keitaro import KeitaroClient
from app.main import app


def offer(offer_id, share):
    return {"offer_id": offer_id, "share": share, "state": "active"}


class Tracker:
    campaign = {"id": 123, "name": "test_gusev_editor", "alias": "testing", "type": "position", "state": "disabled"}
    catalog = [{"id": number, "name": f"Offer {number}", "state": "active"} for number in range(1, 7)]

    def __init__(self):
        self.streams = {
            number: {
                "id": number, "name": f"Flow {number}", "campaign_id": 123, "type": "regular",
                "state": "active", "position": number, "schema": "landings", "offers": [offer(1, 100)],
            }
            for number in (10, 20)
        }
        self.writes = []
        self.rejected_stream = None

    def handle(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if request.method == "PUT":
            stream_id = int(path.split("/")[-1])
            self.writes.append(stream_id)
            if stream_id == self.rejected_stream:
                return httpx.Response(422, json={})
            self.streams[stream_id]["offers"] = json.loads(request.content)["offers"]
            return httpx.Response(200, json=self.streams[stream_id])

        if path == "/report/build":
            data = json.loads(request.content)
            assert data["range"] == {"interval": "today"}
            assert data["filters"][0]["expression"] == 123
            return httpx.Response(200, json={"rows": [{"stream_id": "10", "clicks": "4"}]})
        if path == "/campaigns/123":
            return httpx.Response(200, json=self.campaign)
        if path == "/campaigns/123/streams":
            return httpx.Response(200, json=list(self.streams.values()))
        if path == "/offers":
            return httpx.Response(200, json=self.catalog)
        if path.startswith("/offers/"):
            return httpx.Response(200, json=self.catalog[int(path.split("/")[-1]) - 1])
        if path.startswith("/streams/"):
            return httpx.Response(200, json=self.streams[int(path.split("/")[-1])])
        raise AssertionError(f"Unexpected request {request.method} {path}")


class EditorTest(unittest.IsolatedAsyncioTestCase):
    url = "/api/v1/campaigns/123"

    async def asyncSetUp(self):
        directory = self.enterContext(tempfile.TemporaryDirectory())
        engine = create_engine(f"sqlite:///{Path(directory, 'test.sqlite3').as_posix()}")
        self.addCleanup(engine.dispose)
        Base.metadata.create_all(engine)
        self.enterContext(patch("app.editor_store.engine", engine))

        self.tracker = Tracker()
        upstream = httpx.AsyncClient(
            base_url="https://tracker.example/", transport=httpx.MockTransport(self.tracker.handle),
        )
        self.addAsyncCleanup(upstream.aclose)
        client = KeitaroClient(upstream, "test-key")
        self.enterContext(patch.dict(app.dependency_overrides, {get_keitaro: lambda: client}))
        self.http = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")
        self.addAsyncCleanup(self.http.aclose)

    async def read(self):
        return (await self.http.get(self.url)).raise_for_status().json()

    async def edit(self, version, operation, offer_id, stream_id=10, **options):
        return await self.http.patch(self.url + "/draft", json={
            "version": version, "stream_id": stream_id, "operation": operation, "offer_id": offer_id, **options,
        })

    async def publish(self, version, revision=None):
        return await self.http.post(self.url + "/publications", json={
            "version": version, "confirm_revision": revision,
        })

    async def test_draft_survives_reload_and_prevents_stale_edits(self):
        self.tracker.streams[10]["offers"] = [offer(1, 34), offer(2, 33), offer(3, 33)]
        saved = (await self.edit(0, "add", 4)).raise_for_status().json()
        self.assertEqual(saved, await self.read())
        self.assertEqual(saved["mode"], "draft")
        first_stream = saved["streams"][0]
        self.assertEqual(first_stream["clicks_today"], 4)
        self.assertEqual([item["share"] for item in first_stream["offers"]], [25, 25, 25, 25])
        self.assertIsNone(first_stream["offers"][-1]["published_share"])
        self.assertEqual((await self.edit(0, "remove", 1)).status_code, 409)
        self.assertEqual(self.tracker.writes, [])

    async def test_removes_last_offer_and_can_restore_from_published_history(self):
        saved = (await self.edit(0, "remove", 1)).raise_for_status().json()
        published = (await self.publish(saved["version"])).raise_for_status().json()
        self.assertEqual(published["mode"], "published")
        self.assertEqual(self.tracker.streams[10]["offers"], [])
        row = published["streams"][0]["offers"][0]
        self.assertEqual((row["state"], row["share"]), ("removed", 0))
        restored = (await self.edit(published["version"], "restore", 1)).raise_for_status().json()
        self.assertEqual(restored["streams"][0]["offers"][0]["share"], 100)
        discarded = await self.http.delete(self.url + "/draft", params={"version": restored["version"]})
        self.assertEqual(discarded.raise_for_status().json()["streams"][0]["offers"][0]["state"], "removed")

    async def test_pins_share_and_only_rebalances_unpinned_offers(self):
        self.tracker.streams[10]["offers"] = [offer(1, 34), offer(2, 33), offer(3, 33)]
        saved = (await self.edit(0, "pin", 1, share=25)).raise_for_status().json()
        rows = saved["streams"][0]["offers"]
        self.assertEqual([row["share"] for row in rows], [25, 38, 37])
        self.assertTrue(rows[0]["pinned"])
        published = (await self.publish(saved["version"])).raise_for_status().json()
        self.assertTrue(published["streams"][0]["offers"][0]["pinned"])

    async def test_external_addition_requires_latest_confirmation_and_enters_history(self):
        saved = (await self.edit(0, "add", 2)).raise_for_status().json()
        self.tracker.streams[10]["offers"] = [offer(1, 25), offer(3, 75)]
        changed = await self.read()
        self.assertTrue(changed["external_changed"])
        self.assertTrue(next(row for row in changed["streams"][0]["offers"] if row["id"] == 3)["external_removal"])
        self.assertEqual((await self.publish(saved["version"])).status_code, 409)

        self.tracker.streams[10]["offers"] = [offer(1, 50), offer(3, 50)]
        rejected = await self.publish(saved["version"], changed["remote_revision"])
        self.assertEqual(rejected.status_code, 409)
        revision = rejected.json()["detail"]["remote_revision"]
        result = (await self.publish(saved["version"], revision)).raise_for_status().json()
        self.assertEqual(self.tracker.streams[10]["offers"], [offer(1, 50), offer(2, 50)])
        row = next(item for item in result["streams"][0]["offers"] if item["id"] == 3)
        self.assertEqual((row["state"], row["share"]), ("removed", 0))

    async def test_partial_publish_keeps_the_remaining_draft_and_skips_completed_stream(self):
        first = (await self.edit(0, "remove", 1)).raise_for_status().json()
        second = (await self.edit(first["version"], "remove", 1, stream_id=20)).raise_for_status().json()
        self.tracker.rejected_stream = 20
        response = await self.publish(second["version"])
        self.assertEqual(response.status_code, 502)
        draft = await self.read()
        self.assertEqual([stream["edited"] for stream in draft["streams"]], [False, True])
        self.assertEqual(self.tracker.writes, [10, 20])
        self.assertFalse(draft["external_changed"])
        self.tracker.rejected_stream = None
        published = (await self.publish(draft["version"])).raise_for_status().json()
        self.assertEqual(published["mode"], "published")
        self.assertEqual(self.tracker.writes, [10, 20, 20])
