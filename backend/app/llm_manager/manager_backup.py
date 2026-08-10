import os
import time
import logging
from typing import List, Dict, Optional

from langchain_google_genai import ChatGoogleGenerativeAI

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
    """

    MODEL_NAME = "gemini-3.6-flash"

    def __init__(self):

        self.keys: List[KeyStatus] = []

        self.current_index = 0

        # ChatGoogleGenerativeAI is a Pydantic model.
        # Keep custom key information outside of it.
        self._llm_key_status: Dict[
            int,
            KeyStatus
        ] = {}

        self._load_keys()

    # ========================================================
    # LOAD GEMINI API KEYS
    # ========================================================

    def _load_keys(self):

        for key, value in os.environ.items():

            if (
                key.startswith("GEMINI_API_KEY_")
                and value
                and value.strip()
            ):

                self.keys.append(
                    KeyStatus(
                        key=value.strip(),
                        identifier=key,
                    )
                )

        # Make key order predictable.
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

            # --------------------------------------------
            # KEY IS ON COOLDOWN
            # --------------------------------------------

            if key_status.is_exhausted:

                if now >= key_status.exhausted_until:

                    key_status.is_exhausted = False

                    key_status.exhausted_until = 0

                    logger.info(
                        "Gemini key %s is available again.",
                        key_status.identifier,
                    )

                    return key_status

                continue

            return key_status

        # ------------------------------------------------
        # ALL KEYS ARE CURRENTLY EXHAUSTED
        # ------------------------------------------------

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
            f"All Gemini API keys are currently "
            f"rate-limited. Retry in approximately "
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

        """
        Create a Gemini 3.6 Flash model.

        The temperature argument is retained for compatibility
        with existing agent code.
        """

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
        # CREATE LLM
        # ----------------------------------------------------

        llm = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=key_status.key,

            # Prevent automatic quota retries.
            max_retries=0,
        )

        # ----------------------------------------------------
        # STORE KEY STATUS EXTERNALLY
        # ----------------------------------------------------

        self._llm_key_status[
            id(llm)
        ] = key_status

        return llm

    # ========================================================
    # GET KEY STATUS
    # ========================================================

    def _get_key_status(
        self,
        llm: ChatGoogleGenerativeAI,
    ) -> Optional[KeyStatus]:

        return self._llm_key_status.get(
            id(llm)
        )

    # ========================================================
    # EXTRACT TOKEN USAGE
    # ========================================================

    @staticmethod
    def _extract_token_usage(
        response
    ):

        """
        Extract token usage from LangChain's Gemini response.

        Different versions of langchain-google-genai may expose
        usage through different response fields, so we check the
        supported structures without inventing values.
        """

        input_tokens = 0
        output_tokens = 0

        # ----------------------------------------------------
        # 1. LangChain usage_metadata
        # ----------------------------------------------------

        usage = getattr(
            response,
            "usage_metadata",
            None,
        )

        if isinstance(
            usage,
            dict
        ):

            input_tokens = (
                usage.get(
                    "input_tokens",
                    usage.get(
                        "prompt_token_count",
                        0,
                    ),
                )
                or 0
            )

            output_tokens = (
                usage.get(
                    "output_tokens",
                    usage.get(
                        "completion_tokens",
                        0,
                    ),
                )
                or 0
            )

        # ----------------------------------------------------
        # 2. response_metadata
        # ----------------------------------------------------

        if (
            input_tokens == 0
            and output_tokens == 0
        ):

            metadata = getattr(
                response,
                "response_metadata",
                None,
            )

            if isinstance(
                metadata,
                dict
            ):

                metadata_usage = (
                    metadata.get(
                        "usage_metadata"
                    )
                    or metadata.get(
                        "usage"
                    )
                    or {}
                )

                if isinstance(
                    metadata_usage,
                    dict
                ):

                    input_tokens = (
                        metadata_usage.get(
                            "input_tokens",
                            metadata_usage.get(
                                "prompt_token_count",
                                0,
                            ),
                        )
                        or 0
                    )

                    output_tokens = (
                        metadata_usage.get(
                            "output_tokens",
                            metadata_usage.get(
                                "completion_tokens",
                                0,
                            ),
                        )
                        or 0
                    )

        # ----------------------------------------------------
        # SAFE INTEGER CONVERSION
        # ----------------------------------------------------

        try:
            input_tokens = int(
                input_tokens
            )
        except (
            TypeError,
            ValueError
        ):
            input_tokens = 0

        try:
            output_tokens = int(
                output_tokens
            )
        except (
            TypeError,
            ValueError
        ):
            output_tokens = 0

        return (
            input_tokens,
            output_tokens,
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

        """
        Update the existing llm_key_usage aggregate table.

        No fake values are inserted. If Gemini does not return
        usage metadata, token counts remain zero.
        """

        if key_status is None:
            return

        try:

            # ------------------------------------------------
            # UPSERT USAGE RECORD
            # ------------------------------------------------

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
                        :exhausted_until
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

                    "exhausted_until":
                        (
                            None
                            if not key_status.is_exhausted
                            else
                            # PostgreSQL timestamp from
                            # current time + cooldown.
                            None
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
    # INVOKE GEMINI
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
        llm: ChatGoogleGenerativeAI,
        prompt,
        **kwargs,
    ):

        """
        Invoke Gemini.

        Records:
        - Successful request
        - Prompt tokens
        - Completion tokens
        - Failed requests

        Temporary server errors are retried.
        Quota errors are not automatically retried.
        """

        key_status = (
            self._get_key_status(llm)
        )

        try:

            # ------------------------------------------------
            # ACTUAL GEMINI REQUEST
            # ------------------------------------------------

            response = llm.invoke(
                prompt,
                **kwargs,
            )

            # ------------------------------------------------
            # SUCCESS COUNTER
            # ------------------------------------------------

            if key_status:

                key_status.success_count += 1

            # ------------------------------------------------
            # EXTRACT REAL TOKEN USAGE
            # ------------------------------------------------

            (
                input_tokens,
                output_tokens,
            ) = self._extract_token_usage(
                response
            )

            # ------------------------------------------------
            # SAVE TO DATABASE
            # ------------------------------------------------

            self._record_usage(
                key_status,
                input_tokens,
                output_tokens,
            )

            return response

        except ResourceExhausted as e:

            # ------------------------------------------------
            # 429 QUOTA / RATE LIMIT
            # ------------------------------------------------

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

            # DO NOT retry this exception.
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