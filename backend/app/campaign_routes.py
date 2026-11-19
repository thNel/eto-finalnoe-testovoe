from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from app.campaigns import CampaignCreationError, CreateCampaign, create_campaign
from app.config import settings
from app.keitaro import Campaign, KeitaroClient, KeitaroError, Resource

router = APIRouter(tags=["campaigns"])


class CampaignSummary(Resource):
    state: str
    admin_url: str


class CampaignPage(BaseModel):
    items: list[CampaignSummary]
    has_more: bool


class CreatedCampaign(CampaignSummary):
    tracking_url: str


def get_keitaro(request: Request) -> KeitaroClient:
    return request.app.state.keitaro


Keitaro = Annotated[KeitaroClient, Depends(get_keitaro)]


def campaign_admin_url(campaign_id: int) -> str:
    return f"{str(settings.keitaro_base_url).rstrip('/')}/admin/#!/campaigns/{campaign_id}"


def summary(campaign: Campaign) -> CampaignSummary:
    return CampaignSummary(
        id=campaign.id,
        name=campaign.name,
        state=campaign.state,
        admin_url=campaign_admin_url(campaign.id),
    )


@router.get("/campaigns")
async def get_campaigns(
    client: Keitaro,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
) -> CampaignPage:
    items = await client.list_campaigns(offset=offset, limit=limit + 1)
    return CampaignPage(items=[summary(item) for item in items[:limit]], has_more=len(items) > limit)


@router.get("/offers")
async def search_offers(
    client: Keitaro, q: Annotated[str, Query(max_length=200)] = ""
) -> list[Resource]:
    query = q.strip().casefold()
    offers = await client.list_offers()
    matches = [
        offer for offer in offers
        if offer.state == "active" and (query in offer.name.casefold() or query in str(offer.id))
    ]
    matches.sort(key=lambda offer: (str(offer.id) != query, offer.name.casefold(), offer.id))
    return [Resource(id=offer.id, name=offer.name) for offer in matches[:30]]


@router.post("/campaigns", status_code=201)
async def post_campaign(data: CreateCampaign, client: Keitaro) -> CreatedCampaign:
    try:
        campaign, domain = await create_campaign(client, settings, data)
    except CampaignCreationError as error:
        detail: dict[str, str | int] = {"message": str(error), "step": error.step}
        if error.alias is not None:
            detail["alias"] = error.alias
        if error.state is not None:
            detail["campaign_state"] = error.state
        if error.campaign_id is not None:
            detail["campaign_id"] = error.campaign_id
            detail["admin_url"] = campaign_admin_url(error.campaign_id)
        if error.cause.upstream_status is not None:
            detail["upstream_status"] = error.cause.upstream_status
        raise HTTPException(status_code=error.cause.status, detail=detail) from error

    scheme = "https" if domain.is_ssl else "http"
    tracking_url = f"{scheme}://{domain.name}/{quote(campaign.alias, safe='')}"
    return CreatedCampaign(**summary(campaign).model_dump(), tracking_url=tracking_url)
