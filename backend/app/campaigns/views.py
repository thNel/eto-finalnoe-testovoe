import asyncio

from pydantic import BaseModel

from app.campaigns.drafts import Draft, initial_stream
from app.campaigns.snapshot import Snapshot, editable
from app.database.editor import EditorState
from app.keitaro.client import KeitaroClient


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
        visible = changes or initial_stream(state, stream)
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
