from typing import Annotated, Literal

from fastapi import APIRouter, Path, Query
from pydantic import BaseModel, NonNegativeInt

from app.campaign_routes import CampaignSummary, Keitaro, summary
from app.editor import (
    OfferEdit,
    PublishRequest,
    Snapshot,
    StreamView,
    apply_edit,
    discard,
    editor_lock,
    get_draft,
    publish,
    read_snapshot,
    require_version,
    stream_views,
)
from app.editor_store import EditorState, load_state
from app.keitaro import KeitaroClient

router = APIRouter(tags=["editor"])
CampaignId = Annotated[int, Path(gt=0)]


class CampaignEditor(BaseModel):
    campaign: CampaignSummary
    mode: Literal["published", "draft"]
    version: int
    remote_revision: str
    external_changed: bool
    streams: list[StreamView]


async def _view(client: KeitaroClient, state: EditorState, snapshot: Snapshot) -> CampaignEditor:
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


@router.patch("/campaigns/{campaign_id}/draft")
async def edit_draft(campaign_id: CampaignId, data: OfferEdit, client: Keitaro) -> CampaignEditor:
    async with editor_lock(campaign_id):
        state = load_state(campaign_id)
        require_version(state, data.version)
        snapshot = await read_snapshot(client, campaign_id)
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
        discard(state, snapshot)
        return await _view(client, state, snapshot)


@router.post("/campaigns/{campaign_id}/publications")
async def publish_draft(campaign_id: CampaignId, data: PublishRequest, client: Keitaro) -> CampaignEditor:
    async with editor_lock(campaign_id):
        state = load_state(campaign_id)
        require_version(state, data.version)
        snapshot = await read_snapshot(client, campaign_id)
        await publish(client, state, snapshot, data.confirm_revision)
        return await _view(client, state, snapshot)
