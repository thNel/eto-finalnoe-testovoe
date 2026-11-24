import asyncio
from dataclasses import dataclass
from uuid import uuid4

from pydantic import BaseModel, Field, PositiveInt, field_validator
from pycountry import countries

from app.config import Settings
from app.keitaro.client import KeitaroClient, KeitaroError
from app.keitaro.schemas import Campaign, Domain, Resource, Stream

GOOGLE_URL = "https://www.google.com/"


class CreateCampaign(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    geo: list[str] = Field(min_length=1)
    offer_id: PositiveInt

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("geo")
    @classmethod
    def validate_geo(cls, values: list[str]) -> list[str]:
        codes = list(dict.fromkeys(code.strip().upper() for code in values))
        for code in codes:
            if countries.get(alpha_2=code) is None:
                raise ValueError(f"Неизвестный код страны: {code or 'пустое значение'}.")
        return codes


class CampaignCreationError(Exception):
    def __init__(
        self,
        cause: KeitaroError,
        step: str,
        *,
        campaign_id: int | None,
        state: str | None,
        alias: str | None,
    ):
        super().__init__(str(cause))
        self.cause = cause
        self.step = step
        self.campaign_id = campaign_id
        self.state = state
        self.alias = alias


@dataclass(frozen=True)
class CampaignTarget:
    domain: Domain
    group_id: int
    source_id: int


def _require_resource(resources: list[Resource], name: str, setting: str) -> Resource:
    matches = [resource for resource in resources if resource.name.casefold() == name.casefold()]
    if len(matches) != 1:
        raise KeitaroError(f"Не удалось однозначно выбрать {setting} в Keitaro.", 503)
    return matches[0]


async def _resolve_target(client: KeitaroClient, settings: Settings, offer_id: int) -> CampaignTarget:
    try:
        offer = await client.get_offer(offer_id)
    except KeitaroError as error:
        if error.upstream_status == 404:
            raise KeitaroError("Выбранный оффер недоступен в Keitaro.", 422) from error
        raise
    if offer.state != "active":
        raise KeitaroError("Выбранный оффер должен быть активным.", 422)

    domains, groups, sources = await asyncio.gather(
        client.list_domains(), client.list_campaign_groups(), client.list_traffic_sources()
    )
    domain_name = settings.keitaro_domain.strip().casefold().rstrip(".")
    matched_domains = [
        domain for domain in domains
        if domain.state == "active" and (
            not domain_name or domain.name.casefold().rstrip(".") == domain_name
        )
    ]
    if len(matched_domains) != 1:
        raise KeitaroError(
            "Укажите доступный активный домен в KEITARO_DOMAIN.", 503
        )

    group = _require_resource(groups, settings.keitaro_campaign_group, "KEITARO_CAMPAIGN_GROUP")
    source = _require_resource(
        [source for source in sources if source.state == "active"],
        settings.keitaro_traffic_source,
        "KEITARO_TRAFFIC_SOURCE",
    )
    return CampaignTarget(matched_domains[0], group.id, source.id)


def _verify_setup(
    campaign: Campaign,
    target: CampaignTarget,
    streams: list[Stream],
    geo_stream_id: int,
    offer_stream_id: int,
    data: CreateCampaign,
    geo_stream_type: str,
) -> None:
    if (
        campaign.state != "disabled" or campaign.type != "position"
        or campaign.domain_id != target.domain.id
        or campaign.group_id != target.group_id
        or campaign.traffic_source_id != target.source_id
    ):
        raise KeitaroError("Keitaro не подтвердил домен, группу, источник или статус кампании.")

    by_id = {stream.id: stream for stream in streams}
    geo_stream = by_id.get(geo_stream_id)
    offer_stream = by_id.get(offer_stream_id)
    if (
        len(streams) != 2 or not geo_stream or not offer_stream
        or geo_stream.campaign_id != campaign.id or offer_stream.campaign_id != campaign.id
        or geo_stream.state != "active" or offer_stream.state != "active"
        or geo_stream.position >= offer_stream.position
    ):
        raise KeitaroError("Keitaro не подтвердил два активных потока в нужном порядке.")

    if (
        geo_stream.type != geo_stream_type or geo_stream.schema_type != "redirect"
        or geo_stream.action_type != "http" or geo_stream.action_payload != GOOGLE_URL
        or len(geo_stream.filters) != 1 or geo_stream.filters[0].name != "country"
        or geo_stream.filters[0].mode != "accept"
        or {code.upper() for code in geo_stream.filters[0].payload} != set(data.geo)
    ):
        raise KeitaroError("Keitaro не подтвердил GEO-фильтр или перенаправление на Google.")

    if (
        offer_stream.type != "default" or offer_stream.schema_type != "landings"
        or offer_stream.filters or len(offer_stream.offers) != 1
        or offer_stream.offers[0].offer_id != data.offer_id
        or offer_stream.offers[0].share != 100 or offer_stream.offers[0].state != "active"
    ):
        raise KeitaroError("Keitaro не подтвердил резервный поток с выбранным оффером.")


async def create_campaign(
    client: KeitaroClient, settings: Settings, data: CreateCampaign
) -> tuple[Campaign, Domain]:
    stage = "validate"
    alias = None
    campaign_id = None
    state = None
    try:
        target = await _resolve_target(client, settings, data.offer_id)

        stage = "campaign"
        alias = f"kt-{uuid4().hex[:16]}"
        state = "unknown"
        campaign = await client.create_campaign({
            "name": data.name,
            "alias": alias,
            "state": "disabled",
            "type": "position",
            "domain_id": target.domain.id,
            "group_id": str(target.group_id),
            "traffic_source_id": target.source_id,
        })
        campaign_id, state = campaign.id, campaign.state
        if state != "disabled":
            raise KeitaroError("Keitaro не подтвердил, что кампания отключена.")

        stage = "geo_stream"
        geo_stream_type = "regular" if settings.keitaro_is_emulator else "forced"
        geo_stream = await client.create_stream({
            "campaign_id": campaign_id,
            "name": "GEO → Google",
            "type": geo_stream_type,
            "schema": "redirect",
            "action_type": "http",
            "action_payload": GOOGLE_URL,
            "position": 1,
            "state": "active",
            "collect_clicks": True,
            "filters": [{"name": "country", "mode": "accept", "payload": data.geo}],
        })

        stage = "offer_stream"
        offer_stream = await client.create_stream({
            "campaign_id": campaign_id,
            "name": "Остальной трафик → оффер",
            "type": "default",
            "schema": "landings",
            "action_type": "http",
            "position": 2,
            "state": "active",
            "collect_clicks": True,
            "offers": [{"offer_id": data.offer_id, "share": 100, "state": "active"}],
        })

        stage = "verify"
        campaign = await client.get_campaign(campaign_id)
        state = campaign.state
        streams = await client.list_streams(campaign_id)
        _verify_setup(campaign, target, streams, geo_stream.id, offer_stream.id, data, geo_stream_type)

        stage = "enable"
        state = "unknown"
        try:
            campaign = await client.enable_campaign(campaign_id)
        except KeitaroError as enable_error:
            try:
                campaign = await client.get_campaign(campaign_id)
            except KeitaroError:
                raise enable_error
            state = campaign.state
            if state != "active":
                raise enable_error
        state = campaign.state
        if state != "active":
            raise KeitaroError("Keitaro не подтвердил включение кампании.")

        return campaign, target.domain
    except KeitaroError as error:
        raise CampaignCreationError(
            error, stage, campaign_id=campaign_id, state=state, alias=alias
        ) from error
