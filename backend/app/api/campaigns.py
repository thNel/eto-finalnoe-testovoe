from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Query

from app.api.dependencies import Keitaro
from app.api.schemas import CampaignPage, CreatedCampaign, campaign_admin_url, summary
from app.campaigns.creation import CampaignCreationError, CreateCampaign, create_campaign
from app.config import settings
from app.keitaro.schemas import Resource


router = APIRouter(tags=["campaigns"])


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

    tracking_url = None
    if not settings.keitaro_is_emulator:
        scheme = "https" if domain.is_ssl else "http"
        tracking_url = f"{scheme}://{domain.name}/{quote(campaign.alias, safe='')}"
    return CreatedCampaign(**summary(campaign).model_dump(), tracking_url=tracking_url)
