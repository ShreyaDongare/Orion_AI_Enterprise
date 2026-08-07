from typing import Dict, Any
from app.agents.base_agent import BaseAgent
from app.prompts.agent_prompts import EXECUTIVE_AGENT_PROMPT
from app.agents.memory import ConversationMemory
from langchain_core.output_parsers import StrOutputParser
import logging

logger = logging.getLogger(__name__)

class ExecutiveAgent(BaseAgent):
    def __init__(self):
        super().__init__(agent_type="executive")
        self.chain = EXECUTIVE_AGENT_PROMPT | self.llm | StrOutputParser()

    def run(self, input_text: str, conversation_id: str, **kwargs) -> Dict[str, Any]:
        try:
            history = ConversationMemory.get_history(conversation_id)
            response = self.chain.invoke({
                "input": input_text,
                "history": history
            })
            return {"response": response}
        except Exception as e:
            logger.error(f"Executive agent failed: {e}")
            return {"response": f"Error during executive task: {str(e)}"}
