"""Model provider configuration: LiveKit Inference (default) or BYOK plugins."""

from __future__ import annotations

import logging
import os

from livekit.agents import AgentSession, TurnHandlingOptions, inference

logger = logging.getLogger("agent")

CARTESIA_DEFAULT_VOICE = "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"


def get_model_mode() -> str:
    """Return 'inference' (default) or 'byok'."""
    return os.getenv("MODEL_MODE", "inference").strip().lower()


def build_session() -> AgentSession:
    """Build an AgentSession using LiveKit Inference or bring-your-own-key plugins."""
    mode = get_model_mode()
    turn_handling = TurnHandlingOptions(
        turn_detection=inference.TurnDetector(),
        preemptive_generation={"enabled": True},
    )

    if mode == "byok":
        logger.info("MODEL_MODE=byok — using Deepgram, OpenAI, and Cartesia plugins")
        from livekit.plugins import cartesia, deepgram, openai

        return AgentSession(
            stt=deepgram.STT(model="nova-3"),
            llm=openai.LLM(model=os.getenv("OPENAI_LLM_MODEL", "gpt-4.1-mini")),
            tts=cartesia.TTS(
                model=os.getenv("CARTESIA_TTS_MODEL", "sonic-3"),
                voice=os.getenv("CARTESIA_VOICE_ID", CARTESIA_DEFAULT_VOICE),
            ),
            turn_handling=turn_handling,
        )

    if mode != "inference":
        logger.warning("Unknown MODEL_MODE=%r; falling back to inference", mode)

    logger.info("MODEL_MODE=inference — using LiveKit Inference")
    return AgentSession(
        stt=inference.STT(model="deepgram/nova-3", language="multi"),
        llm=inference.LLM(model="google/gemma-4-31b-it"),
        tts=inference.TTS(
            model="inworld/inworld-tts-2",
            voice=os.getenv("INFERENCE_TTS_VOICE", "Ashley"),
        ),
        turn_handling=turn_handling,
    )
