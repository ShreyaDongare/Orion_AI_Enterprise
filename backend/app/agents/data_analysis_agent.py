from typing import Dict, Any
import logging

from app.agents.base_agent import BaseAgent
from app.prompts.agent_prompts import DATA_ANALYSIS_AGENT_PROMPT

from langchain_core.output_parsers import StrOutputParser


logger = logging.getLogger(__name__)


class DataAnalysisAgent(BaseAgent):

    def __init__(self):
        super().__init__(agent_type="data_analysis")

        # Data Analysis currently uses a normal LLM chain.
        #
        # We are intentionally not using:
        # create_tool_calling_agent()
        #
        # This avoids Gemini tool-calling / thought-signature
        # issues while analyzing data supplied directly in
        # the user's message.
        self.chain = (
            DATA_ANALYSIS_AGENT_PROMPT
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
                f"Data analysis agent failed: {e}",
                exc_info=True
            )

            return {
                "response": (
                    f'Error during data analysis: "{str(e)}"'
                )
            }