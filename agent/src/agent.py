"""Echo personal voice agent entrypoint."""

from __future__ import annotations

import logging

from dotenv import load_dotenv
from livekit.agents import AgentServer, JobContext, cli, room_io
from livekit.plugins import ai_coustics

from assistant import PersonalAssistant
from config import build_session, get_model_mode

logger = logging.getLogger("agent")

load_dotenv(".env.local")

# Re-export for tests and external imports
Assistant = PersonalAssistant

server = AgentServer()


@server.rtc_session(agent_name="echo-agent")
async def echo_agent(ctx: JobContext):
    ctx.log_context_fields = {
        "room": ctx.room.name,
        "model_mode": get_model_mode(),
    }

    session = build_session()

    await session.start(
        agent=PersonalAssistant(),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=ai_coustics.audio_enhancement(
                    model=ai_coustics.EnhancerModel.QUAIL_VF_S
                ),
            ),
        ),
    )

    await ctx.connect()

    await session.generate_reply(
        instructions="Greet the user warmly as Echo and offer your help."
    )


if __name__ == "__main__":
    cli.run_app(server)
