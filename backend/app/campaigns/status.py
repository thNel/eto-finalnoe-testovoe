from typing import Literal

from app.campaigns.drafts import get_draft, store_draft
from app.campaigns.errors import EditorError
from app.campaigns.snapshot import Snapshot, read_snapshot
from app.database.editor import EditorState
from app.keitaro.client import KeitaroClient, KeitaroError


CampaignStatus = Literal["active", "disabled"]


async def update_campaign_status(
    client: KeitaroClient, editor: EditorState, snapshot: Snapshot, status: CampaignStatus,
) -> Snapshot:
    campaign = snapshot.campaign
    if campaign.state == status:
        return snapshot
    if campaign.state not in ("active", "disabled"):
        raise EditorError(409, "campaign_status", "Статус этой кампании нельзя изменить.")

    change = client.enable_campaign if status == "active" else client.disable_campaign
    try:
        await change(campaign.id)
    except KeitaroError as error:
        updated = await read_snapshot(client, campaign.id)
        if updated.campaign.state != status:
            raise error
    else:
        updated = await read_snapshot(client, campaign.id)
        if updated.campaign.state != status:
            raise KeitaroError("Keitaro не подтвердил новый статус кампании.")

    draft = get_draft(editor)
    expected = Snapshot(campaign.model_copy(update={"state": status}), snapshot.streams)
    if draft and draft.base_revision == snapshot.revision() and updated.revision() == expected.revision():
        draft.base_revision = updated.revision()
        store_draft(editor, draft)
    return updated
