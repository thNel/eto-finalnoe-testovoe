import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Literal, TypedDict

from app.campaigns.errors import EditorError
from app.campaigns.snapshot import configuration_revision, editor_lock, read_snapshot
from app.keitaro.client import KeitaroClient, KeitaroError


logger = logging.getLogger(__name__)


class CampaignRevisionEvent(TypedDict):
    type: Literal["campaign_revision"]
    campaign_id: int
    remote_revision: str | None


class CampaignListRevisionEvent(TypedDict):
    type: Literal["campaign_list_revision"]
    remote_revision: str


CampaignEvent = CampaignRevisionEvent | CampaignListRevisionEvent
WatchKey = int | tuple[int, int]


@dataclass
class CampaignWatch:
    subscribers: set[asyncio.Queue[CampaignEvent]] = field(default_factory=set)
    latest: CampaignEvent | None = None
    task: asyncio.Task[None] | None = None


class CampaignEvents:
    def __init__(self, client: KeitaroClient, interval: float = 15):
        self.client = client
        self.interval = interval
        self.watches: dict[WatchKey, CampaignWatch] = {}

    @asynccontextmanager
    async def subscribe(self, key: WatchKey) -> AsyncIterator[asyncio.Queue[CampaignEvent]]:
        watch = self.watches.get(key)
        if watch is None:
            watch = CampaignWatch()
            self.watches[key] = watch
            watch.task = asyncio.create_task(self._poll(key, watch))

        queue: asyncio.Queue[CampaignEvent] = asyncio.Queue(maxsize=1)
        watch.subscribers.add(queue)
        if watch.latest is not None:
            queue.put_nowait(watch.latest)
        try:
            yield queue
        finally:
            watch.subscribers.remove(queue)
            if not watch.subscribers and self.watches.get(key) is watch:
                del self.watches[key]
                await self._stop([watch])

    async def close(self) -> None:
        watches = list(self.watches.values())
        self.watches.clear()
        await self._stop(watches)

    @staticmethod
    async def _stop(watches: list[CampaignWatch]) -> None:
        tasks = [watch.task for watch in watches if watch.task is not None]
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _poll(self, key: WatchKey, watch: CampaignWatch) -> None:
        while True:
            try:
                self._notify(watch, await self._read_event(key))
            except KeitaroError as error:
                logger.warning("Polling Keitaro for %s failed: %s", key, error)
            except EditorError as error:
                if error.status == 404 and isinstance(key, int):
                    self._notify(watch, {"type": "campaign_revision", "campaign_id": key, "remote_revision": None})
                else:
                    logger.warning("Polling campaign %s failed with status %s", key, error.status)
            await asyncio.sleep(self.interval)

    async def _read_event(self, key: WatchKey) -> CampaignEvent:
        if isinstance(key, tuple):
            offset, limit = key
            items = await self.client.list_campaigns(offset=offset, limit=limit + 1)
            revision = configuration_revision([
                [(item.id, item.name, item.state) for item in items[:limit]],
                len(items) > limit,
            ])
            return {"type": "campaign_list_revision", "remote_revision": revision}

        async with editor_lock(key):
            snapshot = await read_snapshot(self.client, key)
        return {"type": "campaign_revision", "campaign_id": key, "remote_revision": snapshot.revision()}

    @staticmethod
    def _notify(watch: CampaignWatch, event: CampaignEvent) -> None:
        if watch.latest is not None and watch.latest["remote_revision"] == event["remote_revision"]:
            return
        watch.latest = event
        for queue in watch.subscribers:
            if queue.full():
                queue.get_nowait()
            queue.put_nowait(event)
