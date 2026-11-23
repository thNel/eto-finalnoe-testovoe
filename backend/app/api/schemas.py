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
    tracking_url: str


def campaign_admin_url(campaign_id: int) -> str:
    return f"{str(settings.keitaro_base_url).rstrip('/')}/admin/#!/campaigns/{campaign_id}"


def summary(campaign: Campaign) -> CampaignSummary:
    return CampaignSummary(
        id=campaign.id,
        name=campaign.name,
        state=campaign.state,
        admin_url=campaign_admin_url(campaign.id),
    )
