from app.campaigns.drafts import get_draft
from app.campaigns.snapshot import Snapshot, editable
from app.database.editor import EditorState, save_state


def record_published_offers(state: EditorState, snapshot: Snapshot) -> None:
    current = {
        str(stream.id): sorted({offer.offer_id for offer in stream.offers})
        for stream in snapshot.streams.values()
        if editable(stream)
    }
    previous = state.published_offers
    if previous == current:
        return

    if previous is None:
        draft = get_draft(state)
        previous = {
            str(stream_id): stream.base_offer_ids for stream_id, stream in draft.streams.items()
        } if draft else {}

    removed = dict(state.removed)
    for stream_id, offer_ids in current.items():
        missing = set(removed.get(stream_id, [])) | set(previous.get(stream_id, []))
        missing.difference_update(offer_ids)
        if missing:
            removed[stream_id] = sorted(missing)
        else:
            removed.pop(stream_id, None)
    state.removed = removed
    state.published_offers = current
    save_state(state)
