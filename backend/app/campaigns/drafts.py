from typing import Literal

from pydantic import BaseModel, Field, NonNegativeInt, PositiveInt

from app.campaigns.errors import EditorError
from app.campaigns.snapshot import Snapshot, editable, offer_signature
from app.database.editor import EditorState, save_state
from app.keitaro.client import KeitaroClient, KeitaroError
from app.keitaro.schemas import Stream, StreamOffer


class OfferEdit(BaseModel):
    version: NonNegativeInt
    stream_id: PositiveInt
    offer_id: PositiveInt
    operation: Literal["add", "remove", "restore", "pin", "unpin"]
    share: int | None = Field(default=None, ge=0, le=100)


class DraftOffer(StreamOffer):
    pinned: bool = False


class DraftStream(BaseModel):
    offers: list[DraftOffer]
    base_offer_ids: list[int]
    removed_ids: list[int] = Field(default_factory=list)
    pending_removed: list[int] | None = None


class Draft(BaseModel):
    base_revision: str
    streams: dict[int, DraftStream] = Field(default_factory=dict)


def require_version(state: EditorState, version: int) -> None:
    if state.version != version:
        raise EditorError(409, "draft_version", "Черновик изменился. Загружена последняя версия.")


def get_draft(state: EditorState) -> Draft | None:
    return Draft.model_validate(state.draft) if state.draft is not None else None


def store_draft(state: EditorState, draft: Draft | None, *, bump: bool = True) -> None:
    state.draft = draft.model_dump(mode="json") if draft and draft.streams else None
    if bump:
        state.version += 1
    save_state(state)


def rebalance(offers: list[DraftOffer]) -> None:
    active = [offer for offer in offers if offer.state == "active"]
    if not active:
        return
    unpinned = [offer for offer in active if not offer.pinned]
    remaining = 100 - sum(offer.share for offer in active if offer.pinned)
    if remaining < 0 or (not unpinned and remaining != 0):
        raise EditorError(
            422, "invalid_shares",
            "Закреплённые доли не позволяют распределить 100%. Измените или снимите закрепление.",
        )
    if unpinned:
        share, remainder = divmod(remaining, len(unpinned))
        for index, offer in enumerate(unpinned):
            offer.share = share + (index < remainder)


def initial_stream(state: EditorState, stream: Stream) -> DraftStream:
    pins = state.pins.get(str(stream.id), {})
    return DraftStream(
        base_offer_ids=[offer.offer_id for offer in stream.offers],
        offers=[
            DraftOffer(
                **offer.model_dump(),
                pinned=offer.state == "active" and pins.get(str(offer.offer_id)) == offer.share,
            )
            for offer in stream.offers
        ],
    )


async def apply_edit(
    client: KeitaroClient, state: EditorState, snapshot: Snapshot, data: OfferEdit,
) -> None:
    stream = snapshot.streams.get(data.stream_id)
    if stream is None or not editable(stream):
        raise EditorError(409, "stream_uneditable", "Этот поток недоступен для редактирования офферов.")
    draft = get_draft(state) or Draft(base_revision=snapshot.revision())
    changes = draft.streams.get(stream.id) or initial_stream(state, stream)
    if (
        changes.pending_removed is not None
        and offer_signature(stream.offers) == offer_signature(changes.offers)
    ):
        raise EditorError(409, "publication_pending", "Сначала повторите публикацию или отмените черновик.")
    changes.pending_removed = None
    offer = next((item for item in changes.offers if item.offer_id == data.offer_id), None)

    if data.operation in ("add", "restore"):
        if offer is not None:
            raise EditorError(409, "offer_present", "Оффер уже есть в потоке.")
        try:
            source = await client.get_offer(data.offer_id)
        except KeitaroError as error:
            if error.upstream_status == 404:
                raise EditorError(422, "offer_unavailable", "Оффер недоступен в Keitaro.") from error
            raise
        if source.state != "active":
            raise EditorError(422, "offer_unavailable", "Оффер должен быть активным в Keitaro.")
        changes.offers.append(DraftOffer(offer_id=source.id, share=0, state="active"))
        if source.id in changes.removed_ids:
            changes.removed_ids.remove(source.id)
    elif offer is None:
        raise EditorError(409, "offer_missing", "Оффер уже отсутствует в черновике.")
    elif data.operation == "remove":
        changes.offers.remove(offer)
        changes.removed_ids.append(offer.offer_id)
    else:
        if offer.state != "active":
            raise EditorError(422, "offer_inactive", "Закрепить долю можно у активного оффера.")
        offer.pinned = data.operation == "pin"
        if offer.pinned and data.share is not None:
            offer.share = data.share

    rebalance(changes.offers)
    draft.streams[stream.id] = changes
    store_draft(state, draft)
