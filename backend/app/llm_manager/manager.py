import os
import time
import logging
from typing import List, Dict, Optional, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel
from google.api_core.exceptions import ResourceExhausted, InvalidArgument, InternalServerError, RetryError
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

logger = logging.getLogger(__name__)

class KeyStatus:
    def __init__(self, key: str, identifier: str):
        self.key = key
        self.identifier = identifier
        self.is_exhausted = False
        self.exhausted_until = 0
        self.success_count = 0
        self.fail_count = 0

class LLMManager:
    """Manages multiple Gemini API keys with round-robin rotation and failover."""
    def __init__(self):
        self.keys: List[KeyStatus] = []
        self.current_index = 0
        self._load_keys()

    def _load_keys(self):
        # Load all environment variables that start with GEMINI_API_KEY_
        for key, value in os.environ.items():
            if key.startswith("GEMINI_API_KEY_") and value:
                self.keys.append(KeyStatus(key=value, identifier=key))
        if not self.keys:
            logger.warning("No GEMINI_API_KEY_* found in environment.")
            
    def _get_next_available_key(self) -> Optional[KeyStatus]:
        if not self.keys:
            raise ValueError("No LLM keys configured.")
        
        start_index = self.current_index
        now = time.time()
        
        while True:
            key_status = self.keys[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.keys)
            
            # Check cooldown
            if key_status.is_exhausted:
                if now > key_status.exhausted_until:
                    key_status.is_exhausted = False
                    key_status.exhausted_until = 0
                    return key_status
            else:
                return key_status
                
            # If we looped all the way around, all keys are exhausted
            if self.current_index == start_index:
                raise Exception("All Gemini API keys are currently exhausted or rate-limited.")

    def mark_key_exhausted(self, key_status: KeyStatus, cooldown_seconds: int = 60):
        key_status.is_exhausted = True
        key_status.exhausted_until = time.time() + cooldown_seconds
        key_status.fail_count += 1
        logger.warning(f"Marked key {key_status.identifier} as exhausted for {cooldown_seconds}s.")

    def get_model(self, agent_type: str, temperature: float = 0.7) -> ChatGoogleGenerativeAI:
        """
        Returns a ChatGoogleGenerativeAI configured with the next available key.
        Maps agent_type to specific models (e.g. flash vs pro).
        """
        key_status = self._get_next_available_key()
        
        model_name = "gemini-2.5-flash"
        # Configurable routing based on agent type
        complex_agents = ["research", "report", "presentation", "executive"]
        if agent_type in complex_agents:
            model_name = "gemini-2.5-pro"
            
        llm = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=key_status.key,
            temperature=temperature,
            convert_system_message_to_human=True
        )
        
        # Attach status object to LLM for tracking later if needed
        setattr(llm, "_orion_key_status", key_status)
        return llm

    @retry(
        retry=retry_if_exception_type((ResourceExhausted, InternalServerError, RetryError)),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3)
    )
    def invoke_with_retry(self, llm: ChatGoogleGenerativeAI, prompt, **kwargs):
        """Invoke the LLM with automatic retry for transient errors."""
        key_status: KeyStatus = getattr(llm, "_orion_key_status", None)
        try:
            res = llm.invoke(prompt, **kwargs)
            if key_status:
                key_status.success_count += 1
            return res
        except ResourceExhausted as e:
            if key_status:
                self.mark_key_exhausted(key_status, cooldown_seconds=60)
            raise e
        except Exception as e:
            if key_status:
                key_status.fail_count += 1
            raise e

llm_manager = LLMManager()
