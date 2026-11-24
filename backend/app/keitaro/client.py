from typing import TypeVar

import httpx
from pydantic import TypeAdapter, ValidationError

from app.keitaro.schemas import Campaign, ClickReport, Domain, Resource, StatefulResource, Stream


class KeitaroError(Exception):
    def __init__(self, message: str, status: int = 502, upstream_status: int | None = None):
        super().__init__(message)
        self.status = status
        self.upstream_status = upstream_status


T = TypeVar("T")


class KeitaroClient:
    def __init__(self, http: httpx.AsyncClient, api_key: str, *, supports_reports: bool = True):
        self.http = http
        self.api_key = api_key
        self.supports_reports = supports_reports

    async def _request(
        self,
        method: str,
        path: str,
        response_type: type[T],
        *,
        params: dict[str, str | int] | None = None,
        payload: dict | None = None,
    ) -> T:
        if not self.api_key:
            raise KeitaroError("Укажите KEITARO_API_KEY в настройках сервера.", 503)

        try:
            response = await self.http.request(
                method, path, headers={"Api-Key": self.api_key}, params=params, json=payload
            )
        except httpx.TimeoutException as error:
            raise KeitaroError("Keitaro не ответил вовремя.", 504) from error
        except httpx.RequestError as error:
            raise KeitaroError("Не удалось подключиться к Keitaro.") from error

        if not response.is_success:
            status = response.status_code
            message = (
                "Keitaro отказал в доступе. Проверьте права API-ключа."
                if status in (401, 403)
                else f"Keitaro вернул ошибку HTTP {status}."
            )
            raise KeitaroError(message, upstream_status=status)

        try:
            return TypeAdapter(response_type).validate_json(response.content)
        except ValidationError as error:
            raise KeitaroError("Keitaro вернул ответ в неожиданном формате.") from error

    async def list_campaigns(self, *, offset: int, limit: int) -> list[Campaign]:
        return await self._request(
            "GET", "campaigns", list[Campaign], params={"offset": offset, "limit": limit}
        )

    async def list_offers(self) -> list[StatefulResource]:
        return await self._request("GET", "offers", list[StatefulResource])

    async def get_offer(self, offer_id: int) -> StatefulResource:
        return await self._request("GET", f"offers/{offer_id}", StatefulResource)

    async def list_domains(self) -> list[Domain]:
        return await self._request("GET", "domains", list[Domain])

    async def list_campaign_groups(self) -> list[Resource]:
        return await self._request(
            "GET", "groups", list[Resource], params={"type": "campaigns"}
        )

    async def list_traffic_sources(self) -> list[StatefulResource]:
        return await self._request("GET", "traffic_sources", list[StatefulResource])

    async def create_campaign(self, payload: dict) -> Campaign:
        return await self._request("POST", "campaigns", Campaign, payload=payload)

    async def get_campaign(self, campaign_id: int) -> Campaign:
        return await self._request("GET", f"campaigns/{campaign_id}", Campaign)

    async def create_stream(self, payload: dict) -> Stream:
        return await self._request("POST", "streams", Stream, payload=payload)

    async def list_streams(self, campaign_id: int) -> list[Stream]:
        return await self._request("GET", f"campaigns/{campaign_id}/streams", list[Stream])

    async def get_stream(self, stream_id: int) -> Stream:
        return await self._request("GET", f"streams/{stream_id}", Stream)

    async def update_stream_offers(self, stream_id: int, offers: list[dict]) -> Stream:
        return await self._request("PUT", f"streams/{stream_id}", Stream, payload={"offers": offers})

    async def stream_clicks_today(self, campaign_id: int) -> dict[int, int] | None:
        if not self.supports_reports:
            return None
        report = await self._request("POST", "report/build", ClickReport, payload={
            "range": {"interval": "today"},
            "dimensions": ["stream_id"],
            "measures": ["clicks"],
            "filters": [{"name": "campaign_id", "operator": "EQUALS", "expression": campaign_id}],
        })
        return {row.stream_id: row.clicks for row in report.rows if row.stream_id is not None}

    async def enable_campaign(self, campaign_id: int) -> Campaign:
        return await self._request("POST", f"campaigns/{campaign_id}/enable", Campaign)
