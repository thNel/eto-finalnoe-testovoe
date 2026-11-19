import asyncio
import hashlib
import json
from dataclasses import dataclass
from typing import Literal
from weakref import WeakValueDictionary

from fastapi import HTTPException
from pydantic import BaseModel, Field, NonNegativeInt, PositiveInt

from app.editor_store import EditorState, save_state
from app.keitaro import Campaign, KeitaroClient, KeitaroError, Stream, StreamOffer

_locks: WeakValueDictionary[int, asyncio.Lock] = WeakValueDictionary()


def editor_lock(campaign_id: int) -> asyncio.Lock:
    return _locks.setdefault(campaign_id, asyncio.Lock())


class OfferEdit(BaseModel):
    version: NonNegativeInt
    stream_id: PositiveInt
    offer_id: PositiveInt
    operation: Literal["add", "remove", "restore", "pin", "unpin"]
    share: int | None = Field(default=None, ge=0, le=100)


class PublishRequest(BaseModel):
    version: NonNegativeInt
    confirm_revision: str | None = Field(default=None, min_length=64, max_length=64)


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


class OfferView(BaseModel):
    id: int
    name: str
    published_share: int | None
    share: int
    state: str
    pinned: bool = False
    external_removal: bool = False


class StreamView(BaseModel):
    id: int
    name: str
    state: str
    editable: bool
    edited: bool
    clicks_today: int | None
    offers: list[OfferView]


@dataclass
class Snapshot:
    campaign: Campaign
    streams: dict[int, Stream]

    def revision(self) -> str:
        streams = []
        for stream in sorted(self.streams.values(), key=lambda item: item.id):
            config = stream.model_dump(exclude={"offers"})
            config["offers"] = offer_signature(stream.offers)
            streams.append(config)
        data = json.dumps([self.campaign.model_dump(), streams], sort_keys=True)
        return hashlib.sha256(data.encode()).hexdigest()


def edit_error(status: int, code: str, message: str, **detail) -> HTTPException:
    return HTTPException(status, detail={"code": code, "message": message, **detail})


def require_version(state: EditorState, version: int) -> None:
    if state.version != version:
        raise edit_error(409, "draft_version", "Черновик изменился. Загружена последняя версия.")


def get_draft(state: EditorState) -> Draft | None:
    return Draft.model_validate(state.draft) if state.draft is not None else None


def store_draft(state: EditorState, draft: Draft | None, *, bump: bool = True) -> None:
    state.draft = draft.model_dump(mode="json") if draft and draft.streams else None
    if bump:
        state.version += 1
    save_state(state)


async def read_snapshot(client: KeitaroClient, campaign_id: int) -> Snapshot:
    try:
        campaign, streams = await asyncio.gather(
            client.get_campaign(campaign_id), client.list_streams(campaign_id)
        )
    except KeitaroError as error:
        if error.upstream_status == 404:
            raise edit_error(404, "campaign_missing", "Кампания не найдена в Keitaro.") from error
        raise
    return Snapshot(campaign, {stream.id: stream for stream in streams})


def offer_signature(offers: list[StreamOffer] | list[DraftOffer]) -> list[tuple[int, str, int]]:
    return sorted((offer.offer_id, offer.state, offer.share) for offer in offers)


def editable(stream: Stream) -> bool:
    return stream.schema_type == "landings" and stream.state != "deleted"


def rebalance(offers: list[DraftOffer]) -> None:
    active = [offer for offer in offers if offer.state == "active"]
    if not active:
        return
    unpinned = [offer for offer in active if not offer.pinned]
    remaining = 100 - sum(offer.share for offer in active if offer.pinned)
    if remaining < 0 or (not unpinned and remaining != 0):
        raise edit_error(
            422, "invalid_shares",
            "Закреплённые доли не позволяют распределить 100%. Измените или снимите закрепление.",
        )
    if unpinned:
        share, remainder = divmod(remaining, len(unpinned))
        for index, offer in enumerate(unpinned):
            offer.share = share + (index < remainder)


def _initial_stream(state: EditorState, stream: Stream) -> DraftStream:
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
        raise edit_error(409, "stream_uneditable", "Этот поток недоступен для редактирования офферов.")
    draft = get_draft(state) or Draft(base_revision=snapshot.revision())
    changes = draft.streams.get(stream.id) or _initial_stream(state, stream)
    if (
        changes.pending_removed is not None
        and offer_signature(stream.offers) == offer_signature(changes.offers)
    ):
        raise edit_error(409, "publication_pending", "Сначала повторите публикацию или отмените черновик.")
    changes.pending_removed = None
    offer = next((item for item in changes.offers if item.offer_id == data.offer_id), None)

    if data.operation in ("add", "restore"):
        if offer is not None:
            raise edit_error(409, "offer_present", "Оффер уже есть в потоке.")
        try:
            source = await client.get_offer(data.offer_id)
        except KeitaroError as error:
            if error.upstream_status == 404:
                raise edit_error(422, "offer_unavailable", "Оффер недоступен в Keitaro.") from error
            raise
        if source.state != "active":
            raise edit_error(422, "offer_unavailable", "Оффер должен быть активным в Keitaro.")
        changes.offers.append(DraftOffer(offer_id=source.id, share=0, state="active"))
        if source.id in changes.removed_ids:
            changes.removed_ids.remove(source.id)
    elif offer is None:
        raise edit_error(409, "offer_missing", "Оффер уже отсутствует в черновике.")
    elif data.operation == "remove":
        changes.offers.remove(offer)
        changes.removed_ids.append(offer.offer_id)
    else:
        if offer.state != "active":
            raise edit_error(422, "offer_inactive", "Закрепить долю можно у активного оффера.")
        offer.pinned = data.operation == "pin"
        if offer.pinned and data.share is not None:
            offer.share = data.share

    rebalance(changes.offers)
    draft.streams[stream.id] = changes
    store_draft(state, draft)


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
        raise edit_error(409, "draft_missing", "У кампании нет изменений для публикации.")
    revision = snapshot.revision()
    for stream_id in draft.streams:
        stream = snapshot.streams.get(stream_id)
        if stream is None or not editable(stream):
            raise edit_error(409, "stream_uneditable", "Изменённый поток удалён или больше не принимает офферы.")
    if revision != draft.base_revision and confirm_revision != revision:
        raise edit_error(
            409, "external_change", "Кампания изменилась в Keitaro.",
            remote_revision=revision,
        )

    for stream_id, changes in list(draft.streams.items()):
        stream = snapshot.streams[stream_id]
        current_ids = {offer.offer_id for offer in stream.offers}
        desired_ids = {offer.offer_id for offer in changes.offers}
        changes.pending_removed = sorted(set(changes.pending_removed or []) | (current_ids - desired_ids))
        store_draft(state, draft, bump=False)
        try:
            updated = await _apply_stream(client, snapshot.campaign.id, stream, changes)
        except KeitaroError as error:
            raise edit_error(error.status, "publication_failed", str(error), stream_id=stream_id) from error

        _record_publication(state, stream_id, changes)
        snapshot.streams[stream_id] = updated
        del draft.streams[stream_id]
        draft.base_revision = snapshot.revision()
        store_draft(state, draft)


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


async def stream_views(
    client: KeitaroClient, state: EditorState, snapshot: Snapshot, draft: Draft | None,
) -> list[StreamView]:
    catalog, counts = await asyncio.gather(
        client.list_offers(), client.stream_clicks_today(snapshot.campaign.id),
        return_exceptions=True,
    )
    names = {offer.id: offer.name for offer in catalog} if isinstance(catalog, list) else {}
    views = []
    for stream in sorted(snapshot.streams.values(), key=lambda item: (item.position, item.id)):
        remote = {offer.offer_id: offer for offer in stream.offers}
        changes = draft.streams.get(stream.id) if draft else None
        visible = changes or _initial_stream(state, stream)
        current = {offer.offer_id: offer for offer in visible.offers}
        removed = set(state.removed.get(str(stream.id), []))
        ids = dict.fromkeys([*current, *remote, *visible.removed_ids, *sorted(removed)])
        offers = []
        for offer_id in ids:
            offer = current.get(offer_id)
            published = remote.get(offer_id)
            offers.append(OfferView(
                id=offer_id,
                name=names.get(offer_id, f"Оффер #{offer_id}"),
                published_share=published.share if published else None,
                share=offer.share if offer else 0,
                state=offer.state if offer else "removed",
                pinned=offer.pinned if offer else False,
                external_removal=bool(
                    changes and offer is None and published and offer_id not in changes.base_offer_ids
                ),
            ))
        views.append(StreamView(
            id=stream.id, name=stream.name or f"Поток #{stream.id}", state=stream.state,
            editable=editable(stream), edited=changes is not None,
            clicks_today=counts.get(stream.id, 0) if isinstance(counts, dict) else None,
            offers=offers,
        ))
    return views
