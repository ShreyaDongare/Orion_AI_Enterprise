import os
import time
import logging
from typing import List, Dict, Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.outputs import LLMResult

from google.api_core.exceptions import (
    ResourceExhausted,
    InternalServerError,
    RetryError,
)

from tenacity import (
    retry,
    wait_exponential,
    stop_after_attempt,
    retry_if_exception_type,
)

from sqlalchemy import text

from app.extensions import db


logger = logging.getLogger(__name__)


# ============================================================
# GEMINI API KEY STATUS
# ============================================================

class KeyStatus:

    def __init__(
        self,
        key: str,
        identifier: str,
    ):
        self.key = key
        self.identifier = identifier

        self.is_exhausted = False
        self.exhausted_until = 0

        self.success_count = 0
        self.fail_count = 0


# ============================================================
# TOKEN USAGE CALLBACK
# ============================================================

class GeminiUsageCallback(BaseCallbackHandler):
    """
    LangChain callback that captures the actual Gemini
    token usage from normal chain.invoke() calls.

    This is important because OrionAI agents use:

        self.chain.invoke(...)

    instead of:

        llm_manager.invoke_with_retry(...)

    Therefore token tracking must happen here.
    """

    def __init__(
        self,
        manager,
        key_status: KeyStatus,
        agent_type: str,
    ):
        super().__init__()

        self.manager = manager
        self.key_status = key_status
        self.agent_type = agent_type

    # ========================================================
    # LLM SUCCESS
    # ========================================================

    def on_llm_end(
        self,
        response: LLMResult,
        **kwargs,
    ) -> None:

        try:

            input_tokens = 0
            output_tokens = 0

            # ------------------------------------------------
            # Get first generated message
            # ------------------------------------------------

            generations = getattr(
                response,
                "generations",
                [],
            )

            if generations:

                first_generation_group = generations[0]

                if first_generation_group:

                    generation = (
                        first_generation_group[0]
                    )

                    message = getattr(
                        generation,
                        "message",
                        None,
                    )

                    # ----------------------------------------
                    # LangChain usage_metadata
                    # ----------------------------------------

                    usage = getattr(
                        message,
                        "usage_metadata",
                        None,
                    )

                    if isinstance(
                        usage,
                        dict,
                    ):

                        input_tokens = (
                            usage.get(
                                "input_tokens",
                                0,
                            )
                            or usage.get(
                                "prompt_token_count",
                                0,
                            )
                            or 0
                        )

                        output_tokens = (
                            usage.get(
                                "output_tokens",
                                0,
                            )
                            or usage.get(
                                "completion_tokens",
                                0,
                            )
                            or 0
                        )

            # ------------------------------------------------
            # Fallback: LLMResult.llm_output
            # ------------------------------------------------

            if (
                input_tokens == 0
                and output_tokens == 0
            ):

                llm_output = getattr(
                    response,
                    "llm_output",
                    None,
                )

                if isinstance(
                    llm_output,
                    dict,
                ):

                    token_usage = (
                        llm_output.get(
                            "token_usage",
                            {}
                        )
                        or {}
                    )

                    if isinstance(
                        token_usage,
                        dict,
                    ):

                        input_tokens = (
                            token_usage.get(
                                "prompt_tokens",
                                0,
                            )
                            or token_usage.get(
                                "input_tokens",
                                0,
                            )
                            or 0
                        )

                        output_tokens = (
                            token_usage.get(
                                "completion_tokens",
                                0,
                            )
                            or token_usage.get(
                                "output_tokens",
                                0,
                            )
                            or 0
                        )

            # ------------------------------------------------
            # Convert safely
            # ------------------------------------------------

            try:
                input_tokens = int(
                    input_tokens or 0
                )
            except (
                TypeError,
                ValueError,
            ):
                input_tokens = 0

            try:
                output_tokens = int(
                    output_tokens or 0
                )
            except (
                TypeError,
                ValueError,
            ):
                output_tokens = 0

            # ------------------------------------------------
            # Record request
            # ------------------------------------------------

            self.manager._record_usage(
                self.key_status,
                input_tokens,
                output_tokens,
            )

            self.key_status.success_count += 1

            logger.info(
                "Gemini usage captured | "
                "agent=%s | key=%s | "
                "input=%d | output=%d",
                self.agent_type,
                self.key_status.identifier,
                input_tokens,
                output_tokens,
            )

        except Exception as e:

            logger.error(
                "Failed to process Gemini usage callback: %s",
                str(e),
                exc_info=True,
            )

    # ========================================================
    # LLM ERROR
    # ========================================================

    def on_llm_error(
        self,
        error,
        **kwargs,
    ) -> None:

        try:

            if self.key_status:

                self.key_status.fail_count += 1

                if isinstance(
                    error,
                    ResourceExhausted,
                ):

                    self.manager.mark_key_exhausted(
                        self.key_status,
                        cooldown_seconds=60,
                    )

                self.manager._record_failed_request(
                    self.key_status
                )

            logger.error(
                "Gemini LLM error | "
                "agent=%s | error=%s",
                self.agent_type,
                str(error),
            )

        except Exception as e:

            logger.error(
                "Failed to process Gemini error callback: %s",
                str(e),
                exc_info=True,
            )


# ============================================================
# LLM MANAGER
# ============================================================

class LLMManager:
    """
    Central Gemini model manager for OrionAI.

    Features:
    - Loads Gemini API keys from environment variables.
    - Supports multiple keys.
    - Round-robin key selection.
    - Temporarily disables keys after quota errors.
    - Retries temporary server errors.
    - Does NOT repeatedly retry quota errors.
    - Uses Gemini 3.6 Flash for all agents.
    - Records real Gemini token usage in PostgreSQL.
    - Tracks normal LangChain chain.invoke() calls.
    """

    MODEL_NAME = "gemini-3.6-flash"

    def __init__(self):

        self.keys: List[KeyStatus] = []

        self.current_index = 0

        # ChatGoogleGenerativeAI is a Pydantic model.
        # Keep custom key information outside it.
        self._llm_key_status: Dict[
            int,
            KeyStatus,
        ] = {}

        self._load_keys()

    # ========================================================
    # LOAD GEMINI API KEYS
    # ========================================================

    def _load_keys(self):

        for key, value in os.environ.items():

            if (
                key.startswith(
                    "GEMINI_API_KEY_"
                )
                and value
                and value.strip()
            ):

                self.keys.append(
                    KeyStatus(
                        key=value.strip(),
                        identifier=key,
                    )
                )

        self.keys.sort(
            key=lambda item: item.identifier
        )

        if not self.keys:

            logger.warning(
                "No GEMINI_API_KEY_* variables found."
            )

        else:

            logger.info(
                "Loaded %d Gemini API key(s).",
                len(self.keys),
            )

    # ========================================================
    # GET NEXT AVAILABLE KEY
    # ========================================================

    def _get_next_available_key(
        self,
    ) -> Optional[KeyStatus]:

        if not self.keys:

            raise ValueError(
                "No Gemini API keys configured. "
                "Add GEMINI_API_KEY_1 to your .env file."
            )

        now = time.time()

        checked = 0

        while checked < len(self.keys):

            key_status = self.keys[
                self.current_index
            ]

            self.current_index = (
                self.current_index + 1
            ) % len(self.keys)

            checked += 1

            if key_status.is_exhausted:

                if (
                    now
                    >= key_status.exhausted_until
                ):

                    key_status.is_exhausted = False
                    key_status.exhausted_until = 0

                    logger.info(
                        "Gemini key %s is available again.",
                        key_status.identifier,
                    )

                    return key_status

                continue

            return key_status

        remaining_times = [
            max(
                0,
                int(
                    key.exhausted_until - now
                ),
            )
            for key in self.keys
            if key.is_exhausted
        ]

        wait_seconds = (
            min(remaining_times)
            if remaining_times
            else 60
        )

        raise ResourceExhausted(
            "All Gemini API keys are currently "
            "rate-limited. Retry in approximately "
            f"{wait_seconds} seconds."
        )

    # ========================================================
    # MARK KEY AS EXHAUSTED
    # ========================================================

    def mark_key_exhausted(
        self,
        key_status: KeyStatus,
        cooldown_seconds: int = 60,
    ):

        key_status.is_exhausted = True

        key_status.exhausted_until = (
            time.time()
            + cooldown_seconds
        )

        key_status.fail_count += 1

        logger.warning(
            "Gemini key %s marked as exhausted "
            "for %d seconds.",
            key_status.identifier,
            cooldown_seconds,
        )

    # ========================================================
    # CREATE GEMINI MODEL
    # ========================================================

    def get_model(
        self,
        agent_type: str,
        temperature: float = 0.7,
    ) -> ChatGoogleGenerativeAI:

        key_status = (
            self._get_next_available_key()
        )

        model_name = self.MODEL_NAME

        logger.info(
            "Creating Gemini model | "
            "Model: %s | Agent: %s | Key: %s",
            model_name,
            agent_type,
            key_status.identifier,
        )

        # ----------------------------------------------------
        # CREATE GEMINI MODEL
        # ----------------------------------------------------

        llm = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=key_status.key,
            max_retries=0,
        )

        # ----------------------------------------------------
        # STORE KEY STATUS
        # ----------------------------------------------------

        self._llm_key_status[
            id(llm)
        ] = key_status

        # ----------------------------------------------------
        # ATTACH CENTRAL USAGE CALLBACK
        # ----------------------------------------------------

        callback = GeminiUsageCallback(
            manager=self,
            key_status=key_status,
            agent_type=agent_type,
        )

        # with_config() returns a Runnable that keeps the
        # original Gemini model behavior while automatically
        # propagating callbacks through LangChain chains.

        llm_with_tracking = llm.with_config(
            callbacks=[callback]
        )

        # Keep reference for compatibility/debugging.
        self._llm_key_status[
            id(llm_with_tracking)
        ] = key_status

        return llm_with_tracking

    # ========================================================
    # GET KEY STATUS
    # ========================================================

    def _get_key_status(
        self,
        llm,
    ) -> Optional[KeyStatus]:

        return self._llm_key_status.get(
            id(llm)
        )

    # ========================================================
    # RECORD TOKEN USAGE
    # ========================================================

    def _record_usage(
        self,
        key_status: Optional[KeyStatus],
        input_tokens: int,
        output_tokens: int,
    ):

        if key_status is None:
            return

        try:

            db.session.execute(
                text(
                    """
                    INSERT INTO llm_key_usage (
                        key_identifier,
                        total_requests,
                        failed_requests,
                        total_prompt_tokens,
                        total_completion_tokens,
                        last_used,
                        is_exhausted,
                        exhausted_until
                    )
                    VALUES (
                        :key_identifier,
                        1,
                        0,
                        :prompt_tokens,
                        :completion_tokens,
                        NOW(),
                        FALSE,
                        NULL
                    )
                    ON CONFLICT (key_identifier)
                    DO UPDATE SET
                        total_requests =
                            llm_key_usage.total_requests + 1,

                        total_prompt_tokens =
                            llm_key_usage.total_prompt_tokens
                            + EXCLUDED.total_prompt_tokens,

                        total_completion_tokens =
                            llm_key_usage.total_completion_tokens
                            + EXCLUDED.total_completion_tokens,

                        last_used = NOW()
                    """
                ),
                {
                    "key_identifier":
                        key_status.identifier,

                    "prompt_tokens":
                        int(input_tokens),

                    "completion_tokens":
                        int(output_tokens),
                },
            )

            db.session.commit()

            logger.info(
                "Recorded Gemini usage | "
                "key=%s | input_tokens=%d | "
                "output_tokens=%d",
                key_status.identifier,
                input_tokens,
                output_tokens,
            )

        except Exception as e:

            logger.error(
                "Failed to record Gemini token usage: %s",
                str(e),
                exc_info=True,
            )

            db.session.rollback()

    # ========================================================
    # RECORD FAILED REQUEST
    # ========================================================

    def _record_failed_request(
        self,
        key_status: Optional[KeyStatus],
    ):

        if key_status is None:
            return

        try:

            db.session.execute(
                text(
                    """
                    INSERT INTO llm_key_usage (
                        key_identifier,
                        total_requests,
                        failed_requests,
                        total_prompt_tokens,
                        total_completion_tokens,
                        last_used,
                        is_exhausted,
                        exhausted_until
                    )
                    VALUES (
                        :key_identifier,
                        1,
                        1,
                        0,
                        0,
                        NOW(),
                        :is_exhausted,
                        CASE
                            WHEN :is_exhausted = TRUE
                            THEN NOW() + INTERVAL '60 seconds'
                            ELSE NULL
                        END
                    )
                    ON CONFLICT (key_identifier)
                    DO UPDATE SET
                        total_requests =
                            llm_key_usage.total_requests + 1,

                        failed_requests =
                            llm_key_usage.failed_requests + 1,

                        last_used = NOW(),

                        is_exhausted =
                            EXCLUDED.is_exhausted,

                        exhausted_until =
                            EXCLUDED.exhausted_until
                    """
                ),
                {
                    "key_identifier":
                        key_status.identifier,

                    "is_exhausted":
                        bool(
                            key_status.is_exhausted
                        ),
                },
            )

            db.session.commit()

        except Exception as e:

            logger.error(
                "Failed to record failed Gemini request: %s",
                str(e),
                exc_info=True,
            )

            db.session.rollback()

    # ========================================================
    # OPTIONAL DIRECT GEMINI INVOCATION
    # ========================================================

    @retry(
        retry=retry_if_exception_type(
            (
                InternalServerError,
                RetryError,
            )
        ),
        wait=wait_exponential(
            multiplier=1,
            min=2,
            max=8,
        ),
        stop=stop_after_attempt(3),
    )
    def invoke_with_retry(
        self,
        llm,
        prompt,
        **kwargs,
    ):

        """
        Direct invocation helper retained for agents or
        future code that explicitly wants manager-controlled
        invocation.

        Normal existing LangChain agents do not need to call
        this method because get_model() now attaches the
        usage callback.
        """

        key_status = (
            self._get_key_status(llm)
        )

        try:

            response = llm.invoke(
                prompt,
                **kwargs,
            )

            if key_status:
                key_status.success_count += 1

            return response

        except ResourceExhausted as e:

            if key_status:

                self.mark_key_exhausted(
                    key_status,
                    cooldown_seconds=60,
                )

                self._record_failed_request(
                    key_status
                )

            logger.warning(
                "Gemini quota/rate limit reached: %s",
                str(e),
            )

            raise

        except Exception as e:

            if key_status:

                key_status.fail_count += 1

                self._record_failed_request(
                    key_status
                )

            logger.error(
                "Gemini invocation failed: %s",
                str(e),
            )

            raise


# ============================================================
# GLOBAL LLM MANAGER
# ============================================================

llm_manager = LLMManager()