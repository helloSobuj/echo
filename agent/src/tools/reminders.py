"""In-session timer / reminder tool for Echo."""

from __future__ import annotations

import asyncio
import logging

from livekit.agents import RunContext, function_tool

logger = logging.getLogger("agent")

MIN_DELAY_SECONDS = 1
MAX_DELAY_SECONDS = 60 * 60  # one hour; reminders only last while the call is open


@function_tool
async def set_reminder(
    context: RunContext,
    delay_seconds: int,
    message: str,
) -> str:
    """Schedule a spoken reminder after a delay during this call.

    Use when the user asks to be reminded, pinged, or notified after some time
    (for example "remind me in five minutes" or "ping me in thirty seconds").
    The reminder only fires while this voice session is still connected.

    Args:
        delay_seconds: How many seconds to wait before reminding (1 to 3600).
        message: Short plain-language reminder to speak when time is up.
    """
    try:
        delay = int(delay_seconds)
    except (TypeError, ValueError):
        return "I need a valid number of seconds for the reminder."

    delay = max(MIN_DELAY_SECONDS, min(MAX_DELAY_SECONDS, delay))
    text = (message or "").strip() or "Time is up."
    session = context.session

    async def _fire() -> None:
        try:
            await asyncio.sleep(delay)
            # Direct say avoids a second LLM generation overlapping other speech.
            await session.say(f"Reminder: {text}")
        except Exception as exc:
            logger.warning("Reminder failed after %ss: %s", delay, exc)

    asyncio.create_task(_fire())
    logger.info("Reminder scheduled in %ss: %s", delay, text[:80])
    return (
        f"Reminder set for {delay} seconds from now. "
        f"Confirm briefly in one short sentence. Do not call set_reminder again."
    )
