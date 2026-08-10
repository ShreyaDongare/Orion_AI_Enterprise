from typing import Dict, Any

import logging

from app.agents.base_agent import BaseAgent
from app.prompts.agent_prompts import RESEARCH_AGENT_PROMPT
from app.tools.search import web_search
from app.agents.memory import ConversationMemory

from langchain_core.output_parsers import StrOutputParser


logger = logging.getLogger(__name__)


class ResearchAgent(BaseAgent):

    def __init__(self):

        super().__init__(
            agent_type="research"
        )

        # ----------------------------------------------------
        # IMPORTANT
        # ----------------------------------------------------
        #
        # We intentionally DO NOT use:
        #
        # create_tool_calling_agent()
        #
        # Gemini 3.6 Flash + tool calling can produce
        # thought_signature errors with the current
        # LangChain integration.
        #
        # Instead:
        #
        # 1. DuckDuckGo performs the search
        # 2. Gemini receives the search results
        # 3. Gemini generates the final research response
        #
        # This keeps web search reliable without Gemini
        # directly calling the tool.
        # ----------------------------------------------------

        self.chain = (
            RESEARCH_AGENT_PROMPT
            | self.llm
            | StrOutputParser()
        )


    # ========================================================
    # RUN RESEARCH
    # ========================================================

    def run(
        self,
        input_text: str,
        conversation_id: str,
        **kwargs
    ) -> Dict[str, Any]:

        try:

            logger.info(
                "Research request received: %s",
                input_text
            )


            # ------------------------------------------------
            # GET CONVERSATION HISTORY
            # ------------------------------------------------

            history = ConversationMemory.get_history(
                conversation_id
            )


            # ------------------------------------------------
            # STEP 1: PERFORM WEB SEARCH DIRECTLY
            # ------------------------------------------------

            logger.info(
                "Running DuckDuckGo web search..."
            )

            search_results = web_search.invoke(
                {
                    "query": input_text
                }
            )


            if not search_results:

                search_results = (
                    "No web search results were found."
                )


            logger.info(
                "Web search completed successfully."
            )


            # ------------------------------------------------
            # STEP 2: SEND SEARCH RESULTS TO GEMINI
            # ------------------------------------------------

            research_prompt = f"""
User research request:

{input_text}


Web search results:

{search_results}


Instructions:

1. Answer the user's research request.
2. Base factual claims on the web search results.
3. Clearly distinguish facts from interpretation.
4. Do not invent sources or information.
5. Provide a concise executive-friendly response.
6. Include a "Sources" section when URLs or identifiable
   sources are available in the search results.
7. If the search results are insufficient, clearly say so.
"""


            logger.info(
                "Sending research results to Gemini."
            )


            response = self.chain.invoke(
                {
                    "input": research_prompt,
                    "history": history or [],
                    "agent_scratchpad": [],
                }
            )


            # ------------------------------------------------
            # RETURN RESPONSE
            # ------------------------------------------------

            return {
                "response": response,
                "agent_used": "research",
            }


        except Exception as e:

            logger.exception(
                "Research agent failed"
            )

            return {
                "response": (
                    "I encountered an error during research: "
                    f"{str(e)}"
                ),
                "agent_used": "research",
            }