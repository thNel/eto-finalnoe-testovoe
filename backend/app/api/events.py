import asyncio
from typing import Annotated

from fastapi import APIRouter, Path, Query, WebSocket, WebSocketDisconnect

from app.campaigns.events import CampaignEvent, CampaignEvents, WatchKey


router = APIRouter()


async def _send_updates(socket: WebSocket, queue: asyncio.Queue[CampaignEvent]) -> None:
    while True:
        await socket.send_json(await queue.get())


async def _wait_for_disconnect(socket: WebSocket) -> None:
    while (await socket.receive())["type"] != "websocket.disconnect":
        pass


async def _watch(socket: WebSocket, key: WatchKey) -> None:
    origin = socket.headers.get("origin")
    host = socket.headers.get("host")
    if origin is not None and (not host or origin not in (f"http://{host}", f"https://{host}")):
        await socket.close(code=1008)
        return

    await socket.accept()
    events: CampaignEvents = socket.app.state.campaign_events
    async with events.subscribe(key) as queue:
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


@router.websocket("/campaigns/{campaign_id}/events")
async def campaign_events(socket: WebSocket, campaign_id: Annotated[int, Path(gt=0)]) -> None:
    await _watch(socket, campaign_id)


@router.websocket("/campaigns/events")
async def campaign_list_events(
    socket: WebSocket,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
) -> None:
    await _watch(socket, (offset, limit))
