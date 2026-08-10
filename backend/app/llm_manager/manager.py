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


logger = logging.getLogger(__name__)


# ============================================================
# GEMINI API KEY STATUS
# ============================================================

class KeyStatus:

    def __init__(self, key: str, identifier: str):

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
    """

    MODEL_NAME = "gemini-3.6-flash"

    def __init__(self):

        self.keys: List[KeyStatus] = []

        self.current_index = 0

        # ChatGoogleGenerativeAI is a Pydantic model.
        # Keep custom key information outside of it.
        self._llm_key_status: Dict[int, KeyStatus] = {}

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

        Gemini 3.6 Flash is used consistently across
        OrionAI agents during development.

        The temperature argument is retained for compatibility
        with existing agent code, but is intentionally not
        passed to Gemini 3.6 Flash because Google's current
        Gemini 3.x guidance deprecates sampling parameters.
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

            # IMPORTANT:
            # Do not pass temperature for Gemini 3.6.
            #
            # max_retries=0 prevents the underlying client
            # from repeatedly retrying quota errors.
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

        Important:
        - Temporary server errors are retried.
        - Quota errors are NOT automatically retried.
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

            # ------------------------------------------------
            # 429 QUOTA / RATE LIMIT
            # ------------------------------------------------

            if key_status:

                self.mark_key_exhausted(
                    key_status,
                    cooldown_seconds=60,
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

            logger.error(
                "Gemini invocation failed: %s",
                str(e),
            )

            raise


# ============================================================
# GLOBAL LLM MANAGER
# ============================================================

llm_manager = LLMManager()