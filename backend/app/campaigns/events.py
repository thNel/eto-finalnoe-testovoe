import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Literal, TypedDict

from app.campaigns.errors import EditorError
from app.campaigns.snapshot import editor_lock, read_snapshot
from app.keitaro.client import KeitaroClient, KeitaroError


logger = logging.getLogger(__name__)


class CampaignEvent(TypedDict):
    type: Literal["campaign_revision"]
    campaign_id: int
    remote_revision: str | None


@dataclass
class CampaignWatch:
    subscribers: set[asyncio.Queue[CampaignEvent]] = field(default_factory=set)
    latest: CampaignEvent | None = None
    task: asyncio.Task[None] | None = None


class CampaignEvents:
    def __init__(self, client: KeitaroClient, interval: float = 15):
        self.client = client
        self.interval = interval
        self.watches: dict[int, CampaignWatch] = {}

    @asynccontextmanager
    async def subscribe(self, campaign_id: int) -> AsyncIterator[asyncio.Queue[CampaignEvent]]:
        watch = self.watches.get(campaign_id)
        if watch is None:
            watch = CampaignWatch()
            self.watches[campaign_id] = watch
            watch.task = asyncio.create_task(self._poll(campaign_id, watch))

        queue: asyncio.Queue[CampaignEvent] = asyncio.Queue(maxsize=1)
        watch.subscribers.add(queue)
        if watch.latest is not None:
            queue.put_nowait(watch.latest)
        try:
            yield queue
        finally:
            watch.subscribers.remove(queue)
            if not watch.subscribers and self.watches.get(campaign_id) is watch:
                del self.watches[campaign_id]
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

    async def _poll(self, campaign_id: int, watch: CampaignWatch) -> None:
        while True:
            try:
                async with editor_lock(campaign_id):
                    snapshot = await read_snapshot(self.client, campaign_id)
                self._notify(campaign_id, watch, snapshot.revision())
            except KeitaroError as error:
                logger.warning("Polling Keitaro for campaign %s failed: %s", campaign_id, error)
            except EditorError as error:
                if error.status == 404:
                    self._notify(campaign_id, watch, None)
                else:
                    logger.warning("Polling campaign %s failed with status %s", campaign_id, error.status)
            await asyncio.sleep(self.interval)

    @staticmethod
    def _notify(campaign_id: int, watch: CampaignWatch, revision: str | None) -> None:
        if watch.latest is not None and watch.latest["remote_revision"] == revision:
            return
        event: CampaignEvent = {
            "type": "campaign_revision",
            "campaign_id": campaign_id,
            "remote_revision": revision,
        }
        watch.latest = event
        for queue in watch.subscribers:
            if queue.full():
                queue.get_nowait()
            queue.put_nowait(event)
