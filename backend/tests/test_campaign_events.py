import asyncio
import unittest
from unittest.mock import AsyncMock, Mock, patch

from app.campaigns.errors import EditorError
from app.campaigns.events import CampaignEvents
from app.keitaro.client import KeitaroError
from app.keitaro.schemas import Campaign


class CampaignEventsTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.client = Mock()
        self.read = self.enterContext(patch("app.campaigns.events.read_snapshot", new_callable=AsyncMock))
        self.events = CampaignEvents(self.client, interval=3600)
        self.addAsyncCleanup(self.events.close)

    async def message(self, queue):
        return await asyncio.wait_for(queue.get(), timeout=1)

    async def test_shares_one_watch_for_a_campaign_and_stops_after_last_disconnect(self):
        self.read.return_value = Mock(revision=Mock(return_value="revision-1"))
        async with self.events.subscribe(10) as first:
            initial = await self.message(first)
            self.assertEqual(initial["remote_revision"], "revision-1")
            one_task = self.events.watches[10].task
            async with self.events.subscribe(10) as second:
                self.assertEqual(await self.message(second), initial)
                self.assertIs(self.events.watches[10].task, one_task)
                self.read.assert_awaited_once_with(self.client, 10)
                async with self.events.subscribe(20) as other_campaign:
                    self.assertEqual((await self.message(other_campaign))["campaign_id"], 20)
                    self.assertIsNot(self.events.watches[20].task, one_task)
            self.assertEqual(list(self.events.watches), [10])
            self.assertFalse(one_task.done())
        self.assertEqual(self.events.watches, {})
        self.assertTrue(one_task.cancelled())

    async def test_broadcasts_changed_revisions_but_skips_repeated_values(self):
        next_poll = asyncio.Event()
        allow_poll = asyncio.Event()
        revision = "before"
        polls = 0

        async def read(_, __):
            nonlocal polls
            polls += 1
            if polls > 1:
                next_poll.set()
                await allow_poll.wait()
                allow_poll.clear()
            return Mock(revision=Mock(return_value=revision))

        self.read.side_effect = read
        self.events.interval = 0
        async with self.events.subscribe(10) as first, self.events.subscribe(10) as second:
            self.assertEqual((await self.message(first))["remote_revision"], "before")
            self.assertEqual((await self.message(second))["remote_revision"], "before")
            await asyncio.wait_for(next_poll.wait(), timeout=1)
            next_poll.clear()
            allow_poll.set()
            await asyncio.wait_for(next_poll.wait(), timeout=1)
            self.assertTrue(first.empty() and second.empty())
            revision = "after"
            allow_poll.set()
            self.assertEqual((await self.message(first))["remote_revision"], "after")
            self.assertEqual((await self.message(second))["remote_revision"], "after")

    async def test_retries_failed_polls_and_notifies_when_campaign_disappears(self):
        self.read.side_effect = [KeitaroError("Timeout", 504), EditorError(404, "campaign_missing", "Missing")]
        self.events.interval = 0.01
        with self.assertLogs("app.campaigns.events", level="WARNING"):
            async with self.events.subscribe(10) as queue:
                self.assertIsNone((await self.message(queue))["remote_revision"])
        self.assertEqual(self.read.await_count, 2)

    async def test_shares_list_page_watch_and_broadcasts_external_rename(self):
        campaign = Campaign(id=10, name="Before", alias="test", type="position", state="active")
        next_poll = asyncio.Event()
        allow_poll = asyncio.Event()
        polls = 0

        async def list_campaigns(*, offset, limit):
            nonlocal polls
            self.assertEqual((offset, limit), (25, 26))
            polls += 1
            if polls > 1:
                next_poll.set()
                await allow_poll.wait()
            return [campaign]

        self.client.list_campaigns = AsyncMock(side_effect=list_campaigns)
        self.events.interval = 0
        key = (25, 25)
        async with self.events.subscribe(key) as first, self.events.subscribe(key) as second:
            initial = await self.message(first)
            self.assertEqual(initial["type"], "campaign_list_revision")
            self.assertEqual(await self.message(second), initial)
            await asyncio.wait_for(next_poll.wait(), timeout=1)
            campaign.name = "After"
            allow_poll.set()
            changed = await self.message(first)
            self.assertNotEqual(changed["remote_revision"], initial["remote_revision"])
            self.assertEqual(await self.message(second), changed)
        self.assertEqual(self.events.watches, {})
