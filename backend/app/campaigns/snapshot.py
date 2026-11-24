import asyncio
import hashlib
import json
from collections.abc import Sequence
from dataclasses import dataclass
from weakref import WeakValueDictionary

from app.campaigns.errors import EditorError
from app.keitaro.client import KeitaroClient, KeitaroError
from app.keitaro.schemas import Campaign, Stream, StreamOffer


_locks: WeakValueDictionary[int, asyncio.Lock] = WeakValueDictionary()


def editor_lock(campaign_id: int) -> asyncio.Lock:
    return _locks.setdefault(campaign_id, asyncio.Lock())


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
        return configuration_revision([self.campaign.model_dump(), streams])


def configuration_revision(value: object) -> str:
    data = json.dumps(value, sort_keys=True)
    return hashlib.sha256(data.encode()).hexdigest()


async def read_snapshot(client: KeitaroClient, campaign_id: int) -> Snapshot:
    try:
        campaign, streams = await asyncio.gather(
            client.get_campaign(campaign_id), client.list_streams(campaign_id)
        )
    except KeitaroError as error:
        if error.upstream_status == 404:
            raise EditorError(404, "campaign_missing", "Кампания не найдена в Keitaro.") from error
        raise
    return Snapshot(campaign, {stream.id: stream for stream in streams})


def offer_signature(offers: Sequence[StreamOffer]) -> list[tuple[int, str, int]]:
    return sorted((offer.offer_id, offer.state, offer.share) for offer in offers)


def editable(stream: Stream) -> bool:
    return stream.schema_type == "landings" and stream.state != "deleted"
