from pydantic import BaseModel

from app.config import settings
from app.keitaro.schemas import Campaign, Resource


class CampaignSummary(Resource):
    state: str
    admin_url: str


class CampaignPage(BaseModel):
    items: list[CampaignSummary]
    has_more: bool


class CreatedCampaign(CampaignSummary):
    tracking_url: str | None


def campaign_admin_url(campaign_id: int) -> str:
    route = f"campaign/{campaign_id}/main" if settings.keitaro_is_emulator else f"campaigns/{campaign_id}"
    return f"{str(settings.keitaro_base_url).rstrip('/')}/admin/#!/{route}"


def summary(campaign: Campaign) -> CampaignSummary:
    return CampaignSummary(
        id=campaign.id,
        name=campaign.name,
        state=campaign.state,
        admin_url=campaign_admin_url(campaign.id),
    )
