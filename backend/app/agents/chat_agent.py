from typing import Dict, Any
import logging

from app.agents.base_agent import BaseAgent
from app.prompts.agent_prompts import CHAT_AGENT_PROMPT
from langchain_core.output_parsers import StrOutputParser


logger = logging.getLogger(__name__)


class ChatAgent(BaseAgent):

    def __init__(self):
        super().__init__(agent_type="chat")

        # General chat does not use tools.
        self.chain = (
            CHAT_AGENT_PROMPT
            | self.llm
            | StrOutputParser()
        )

    def run(
        self,
        input_text: str,
        conversation_id: str,
        **kwargs
    ) -> Dict[str, Any]:

        try:

            response = self.chain.invoke({
                "input": input_text
            })

            return {
                "response": response
            }

        except Exception as e:

            logger.error(
                f"Chat agent failed: {e}",
                exc_info=True
            )

            return {
                "response": (
                    f"I encountered an error: {str(e)}"
                )
            }