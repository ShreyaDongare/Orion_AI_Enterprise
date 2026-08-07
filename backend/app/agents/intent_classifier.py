from app.agents.base_agent import BaseAgent
from app.prompts.agent_prompts import INTENT_CLASSIFIER_PROMPT
from langchain_core.output_parsers import StrOutputParser
import logging

logger = logging.getLogger(__name__)

class IntentClassifierAgent(BaseAgent):
    def __init__(self):
        super().__init__(agent_type="intent_classifier")
        # Use simple string parser for the classifier
        self.chain = INTENT_CLASSIFIER_PROMPT | self.llm | StrOutputParser()

    def run(self, input_text: str, conversation_id: str, **kwargs) -> str:
        """
        Predicts which agent should handle the input.
        Returns the agent name string.
        """
        try:
            from app.llm_manager.manager import llm_manager
            
            # Using the manager's invoke_with_retry for safety
            # But the chain itself needs to be invoked.
            # We can invoke the chain directly, and rely on the underlying LLM retry, 
            # or wrap the chain invoke.
            intent = self.chain.invoke({"input": input_text})
            intent = intent.strip().lower()
            
            valid_intents = [
                "research", "report", "data_analysis", "presentation", 
                "email", "executive", "knowledge", "chat"
            ]
            
            if intent not in valid_intents:
                logger.warning(f"Unknown intent classified: {intent}. Defaulting to chat.")
                return "chat"
                
            return intent
        except Exception as e:
            logger.error(f"Intent classification failed: {e}")
            return "chat" # Failover to general chat
