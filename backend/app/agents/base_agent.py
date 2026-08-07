from abc import ABC, abstractmethod
from typing import Dict, Any
from app.llm_manager.manager import llm_manager
import logging

logger = logging.getLogger(__name__)

class BaseAgent(ABC):
    """Base class for all specialized OrionAI agents."""
    
    def __init__(self, agent_type: str):
        self.agent_type = agent_type
        self.llm = llm_manager.get_model(agent_type=self.agent_type)

    @abstractmethod
    def run(self, input_text: str, conversation_id: str, **kwargs) -> Dict[str, Any]:
        """
        Executes the agent's core logic.
        Should return a dict containing at least the 'response' text, 
        and optionally any structured output or artifacts.
        """
        pass
