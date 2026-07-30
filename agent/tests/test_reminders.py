"""Tests for in-session reminder tool."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from tools.reminders import MAX_DELAY_SECONDS, MIN_DELAY_SECONDS, set_reminder


def _reminder_fn():
    return set_reminder._func  # noqa: SLF001 — test the wrapped coroutine


@pytest.mark.asyncio
async def test_set_reminder_schedules_say(monkeypatch):
    ctx = MagicMock()
    session = MagicMock()
    session.say = AsyncMock()
    ctx.session = session

    slept: list[float] = []
    tasks: list[asyncio.Task] = []

    async def fake_sleep(s: float) -> None:
        slept.append(s)

    real_create_task = asyncio.create_task

    def track_task(coro):
        task = real_create_task(coro)
        tasks.append(task)
        return task

    monkeypatch.setattr(asyncio, "sleep", fake_sleep)
    monkeypatch.setattr(asyncio, "create_task", track_task)

    result = await _reminder_fn()(ctx, delay_seconds=0, message="stretch")

    assert "Reminder set" in result
    assert tasks
    await asyncio.gather(*tasks)
    assert slept == [MIN_DELAY_SECONDS]
    session.say.assert_awaited()
    assert "stretch" in session.say.await_args.args[0]


@pytest.mark.asyncio
async def test_set_reminder_clamps_max(monkeypatch):
    ctx = MagicMock()
    session = MagicMock()
    session.say = AsyncMock()
    ctx.session = session

    slept: list[float] = []
    tasks: list[asyncio.Task] = []

    async def fake_sleep(s: float) -> None:
        slept.append(s)

    real_create_task = asyncio.create_task

    def track_task(coro):
        task = real_create_task(coro)
        tasks.append(task)
        return task

    monkeypatch.setattr(asyncio, "sleep", fake_sleep)
    monkeypatch.setattr(asyncio, "create_task", track_task)

    await _reminder_fn()(ctx, delay_seconds=999_999, message="done")
    await asyncio.gather(*tasks)
    assert slept == [MAX_DELAY_SECONDS]
