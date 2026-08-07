from typing import Dict, Any
from app.agents.base_agent import BaseAgent
from app.prompts.agent_prompts import REPORT_AGENT_PROMPT
from app.agents.memory import ConversationMemory
from langchain_core.output_parsers import StrOutputParser
import logging

logger = logging.getLogger(__name__)

class ReportAgent(BaseAgent):
    def __init__(self):
        super().__init__(agent_type="report")
        self.chain = REPORT_AGENT_PROMPT | self.llm | StrOutputParser()

    def run(self, input_text: str, conversation_id: str, **kwargs) -> Dict[str, Any]:
        try:
            history = ConversationMemory.get_history(conversation_id)
            response = self.chain.invoke({
                "input": input_text,
                "history": history
            })
            return {"response": response}
        except Exception as e:
            logger.error(f"Report agent failed: {e}")
            return {"response": f"Error generating report: {str(e)}"}
