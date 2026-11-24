from typing import Annotated, Literal

from fastapi import APIRouter, Path, Query
from pydantic import BaseModel, Field, NonNegativeInt

from app.api.dependencies import Keitaro
from app.api.schemas import CampaignSummary, summary
from app.campaigns.drafts import OfferEdit, apply_edit, get_draft, require_version
from app.campaigns.history import record_published_offers
from app.campaigns.publication import discard, publish
from app.campaigns.snapshot import Snapshot, editor_lock, read_snapshot
from app.campaigns.status import CampaignStatus, update_campaign_status
from app.campaigns.views import StreamView, stream_views
from app.database.editor import EditorState, load_state
from app.keitaro.client import KeitaroClient


router = APIRouter(tags=["editor"])
CampaignId = Annotated[int, Path(gt=0)]


class PublishRequest(BaseModel):
    version: NonNegativeInt
    confirm_revision: str | None = Field(default=None, min_length=64, max_length=64)

class CampaignStatusRequest(BaseModel):
    state: CampaignStatus



class CampaignEditor(BaseModel):
    campaign: CampaignSummary
    mode: Literal["published", "draft"]
    version: int
    remote_revision: str
    external_changed: bool
    streams: list[StreamView]


async def _view(client: KeitaroClient, state: EditorState, snapshot: Snapshot) -> CampaignEditor:
    record_published_offers(state, snapshot)
    draft = get_draft(state)
    revision = snapshot.revision()
    return CampaignEditor(
        campaign=summary(snapshot.campaign),
        mode="draft" if draft else "published",
        version=state.version,
        remote_revision=revision,
        external_changed=draft is not None and draft.base_revision != revision,
        streams=await stream_views(client, state, snapshot, draft),
    )


@router.get("/campaigns/{campaign_id}")
async def read_campaign(campaign_id: CampaignId, client: Keitaro) -> CampaignEditor:
    async with editor_lock(campaign_id):
        snapshot = await read_snapshot(client, campaign_id)
        return await _view(client, load_state(campaign_id), snapshot)


@router.patch("/campaigns/{campaign_id}/state")
async def change_campaign_state(campaign_id: CampaignId, data: CampaignStatusRequest, client: Keitaro) -> CampaignEditor:
    async with editor_lock(campaign_id):
        state = load_state(campaign_id)
        snapshot = await read_snapshot(client, campaign_id)
        record_published_offers(state, snapshot)
        updated = await update_campaign_status(client, state, snapshot, data.state)
        return await _view(client, state, updated)


@router.patch("/campaigns/{campaign_id}/draft")
async def edit_draft(campaign_id: CampaignId, data: OfferEdit, client: Keitaro) -> CampaignEditor:
    async with editor_lock(campaign_id):
        state = load_state(campaign_id)
        require_version(state, data.version)
        snapshot = await read_snapshot(client, campaign_id)
        record_published_offers(state, snapshot)
        await apply_edit(client, state, snapshot, data)
        return await _view(client, state, snapshot)


@router.delete("/campaigns/{campaign_id}/draft")
async def discard_draft(
    campaign_id: CampaignId, client: Keitaro, version: Annotated[NonNegativeInt, Query()],
) -> CampaignEditor:
    async with editor_lock(campaign_id):
        state = load_state(campaign_id)
        require_version(state, version)
        snapshot = await read_snapshot(client, campaign_id)
        record_published_offers(state, snapshot)
        discard(state, snapshot)
        return await _view(client, state, snapshot)


@router.post("/campaigns/{campaign_id}/publications")
async def publish_draft(campaign_id: CampaignId, data: PublishRequest, client: Keitaro) -> CampaignEditor:
    async with editor_lock(campaign_id):
        state = load_state(campaign_id)
        require_version(state, data.version)
        snapshot = await read_snapshot(client, campaign_id)
        record_published_offers(state, snapshot)
        await publish(client, state, snapshot, data.confirm_revision)
        return await _view(client, state, snapshot)
