from app.campaigns.drafts import DraftStream, get_draft, store_draft
from app.campaigns.errors import EditorError
from app.campaigns.history import record_published_offers
from app.campaigns.snapshot import Snapshot, editable, offer_signature, read_snapshot
from app.database.editor import EditorState
from app.keitaro.client import KeitaroClient, KeitaroError
from app.keitaro.schemas import Stream


def _record_publication(state: EditorState, stream_id: int, changes: DraftStream) -> None:
    key = str(stream_id)
    current_ids = {offer.offer_id for offer in changes.offers}
    removed_ids = set(state.removed.get(key, [])) | set(changes.pending_removed or [])
    state.removed = {**state.removed, key: sorted(removed_ids - current_ids)}
    state.pins = {
        **state.pins,
        key: {
            str(offer.offer_id): offer.share for offer in changes.offers
            if offer.pinned and offer.state == "active"
        },
    }


async def _apply_stream(
    client: KeitaroClient, campaign_id: int, stream: Stream, changes: DraftStream,
) -> Stream:
    if offer_signature(stream.offers) == offer_signature(changes.offers):
        return stream

    error = None
    try:
        await client.update_stream_offers(
            stream.id, [offer.model_dump(exclude={"pinned"}) for offer in changes.offers]
        )
    except KeitaroError as failure:
        error = failure

    try:
        confirmed = await client.get_stream(stream.id)
    except KeitaroError as failure:
        raise error or failure
    if confirmed.campaign_id != campaign_id or offer_signature(confirmed.offers) != offer_signature(changes.offers):
        raise error or KeitaroError("Keitaro не подтвердил новый список офферов.")
    return confirmed


async def publish(
    client: KeitaroClient, state: EditorState, snapshot: Snapshot, confirm_revision: str | None,
) -> None:
    draft = get_draft(state)
    if draft is None:
        raise EditorError(409, "draft_missing", "У кампании нет изменений для публикации.")
    revision = snapshot.revision()
    for stream_id in draft.streams:
        stream = snapshot.streams.get(stream_id)
        if stream is None or not editable(stream):
            raise EditorError(409, "stream_uneditable", "Изменённый поток удалён или больше не принимает офферы.")
    expected_revision = confirm_revision if confirm_revision is not None else draft.base_revision
    if revision != expected_revision:
        raise _external_change(revision)

    for stream_id, changes in list(draft.streams.items()):
        latest = await read_snapshot(client, snapshot.campaign.id)
        latest_revision = latest.revision()
        if latest_revision != revision:
            record_published_offers(state, latest)
            raise _external_change(latest_revision)
        stream = snapshot.streams[stream_id]
        current_ids = {offer.offer_id for offer in stream.offers}
        desired_ids = {offer.offer_id for offer in changes.offers}
        changes.pending_removed = sorted(set(changes.pending_removed or []) | (current_ids - desired_ids))
        store_draft(state, draft, bump=False)
        try:
            updated = await _apply_stream(client, snapshot.campaign.id, stream, changes)
        except KeitaroError as error:
            raise EditorError(error.status, "publication_failed", str(error), stream_id=stream_id) from error

        _record_publication(state, stream_id, changes)
        snapshot.streams[stream_id] = updated
        del draft.streams[stream_id]
        revision = snapshot.revision()
        draft.base_revision = revision
        store_draft(state, draft)


def _external_change(revision: str) -> EditorError:
    return EditorError(409, "external_change", "Кампания изменилась в Keitaro.", remote_revision=revision)


def discard(state: EditorState, snapshot: Snapshot) -> None:
    draft = get_draft(state)
    if draft is None:
        return
    for stream_id, changes in draft.streams.items():
        stream = snapshot.streams.get(stream_id)
        if (
            stream and changes.pending_removed is not None
            and offer_signature(stream.offers) == offer_signature(changes.offers)
        ):
            _record_publication(state, stream_id, changes)
    store_draft(state, None)
