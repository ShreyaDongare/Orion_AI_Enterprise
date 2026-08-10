from typing import Dict, Any
import logging

from app.agents.base_agent import BaseAgent
from app.agents.memory import ConversationMemory
from app.prompts.agent_prompts import EXECUTIVE_AGENT_PROMPT

from langchain_core.output_parsers import StrOutputParser


logger = logging.getLogger(__name__)


class ExecutiveAgent(BaseAgent):

    def __init__(self):

        super().__init__(
            agent_type="executive"
        )

        # ----------------------------------------------------
        # Executive Agent Chain
        # Prompt -> LLM -> String Output
        # ----------------------------------------------------

        self.chain = (
            EXECUTIVE_AGENT_PROMPT
            | self.llm
            | StrOutputParser()
        )

    # ========================================================
    # RUN EXECUTIVE AGENT
    # ========================================================

    def run(
        self,
        input_text: str,
        conversation_id: str,
        **kwargs
    ) -> Dict[str, Any]:

        try:

            logger.info(
                "Executive Agent started | "
                "conversation=%s",
                conversation_id
            )

            # ------------------------------------------------
            # Get conversation history
            # ------------------------------------------------

            history = (
                ConversationMemory.get_history(
                    conversation_id
                )
            )

            # ------------------------------------------------
            # Generate executive response
            # ------------------------------------------------

            response = self.chain.invoke(
                {
                    "input": input_text,
                    "history": history,
                }
            )

            response = str(
                response
            ).strip()

            logger.info(
                "Executive Agent completed | "
                "conversation=%s",
                conversation_id
            )

            return {
                "response": response,
                "sources": [],
            }

        except Exception as e:

            logger.error(
                "Executive Agent failed: %s",
                str(e),
                exc_info=True,
            )

            return {
                "response": (
                    "Error during executive task: "
                    f"{str(e)}"
                ),
                "sources": [],
            }