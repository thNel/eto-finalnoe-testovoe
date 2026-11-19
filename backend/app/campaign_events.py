import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Annotated, Literal, TypedDict

from fastapi import APIRouter, HTTPException, Path, WebSocket, WebSocketDisconnect

from app.editor import editor_lock, read_snapshot
from app.keitaro import KeitaroClient, KeitaroError

router = APIRouter()
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
            except HTTPException as error:
                if error.status_code == 404:
                    self._notify(campaign_id, watch, None)
                else:
                    logger.warning("Polling campaign %s failed with status %s", campaign_id, error.status_code)
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


async def _send_updates(socket: WebSocket, queue: asyncio.Queue[CampaignEvent]) -> None:
    while True:
        await socket.send_json(await queue.get())


async def _wait_for_disconnect(socket: WebSocket) -> None:
    while (await socket.receive())["type"] != "websocket.disconnect":
        pass


@router.websocket("/campaigns/{campaign_id}/events")
async def campaign_events(socket: WebSocket, campaign_id: Annotated[int, Path(gt=0)]) -> None:
    origin = socket.headers.get("origin")
    host = socket.headers.get("host")
    if origin is not None and (not host or origin not in (f"http://{host}", f"https://{host}")):
        await socket.close(code=1008)
        return

    await socket.accept()
    events: CampaignEvents = socket.app.state.campaign_events
    async with events.subscribe(campaign_id) as queue:
        tasks = [
            asyncio.create_task(_send_updates(socket, queue)),
            asyncio.create_task(_wait_for_disconnect(socket)),
        ]
        try:
            done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for task in done:
                task.result()
        except WebSocketDisconnect:
            pass
        finally:
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
