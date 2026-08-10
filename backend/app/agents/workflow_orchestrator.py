from typing import Dict, Any
import logging

from app.agents.intent_classifier import IntentClassifierAgent
from app.agents.research_agent import ResearchAgent
from app.agents.chat_agent import ChatAgent
from app.agents.knowledge_agent import KnowledgeAgent
from app.agents.data_analysis_agent import DataAnalysisAgent
from app.agents.report_agent import ReportAgent
from app.agents.presentation_agent import PresentationAgent
from app.agents.email_agent import EmailAgent
from app.agents.executive_agent import ExecutiveAgent


logger = logging.getLogger(__name__)


class WorkflowOrchestrator:

    def __init__(self):

        # ========================================================
        # INTENT CLASSIFIER
        # ========================================================

        self.classifier = IntentClassifierAgent()


        # ========================================================
        # AVAILABLE AGENTS
        # ========================================================

        self.agents = {

            "research":
                ResearchAgent(),

            "chat":
                ChatAgent(),

            "knowledge":
                KnowledgeAgent(),

            "data_analysis":
                DataAnalysisAgent(),

            "report":
                ReportAgent(),

            "presentation":
                PresentationAgent(),

            "email":
                EmailAgent(),

            "executive":
                ExecutiveAgent(),

        }


    # ============================================================
    # PROCESS REQUEST
    # ============================================================

    def process_request(
        self,
        input_text: str,
        conversation_id: str,
        **kwargs
    ) -> Dict[str, Any]:

        """
        Main entrypoint for OrionAI requests.

        If the frontend explicitly selects an agent,
        that agent is used directly.

        Otherwise, the IntentClassifierAgent determines
        the appropriate agent.
        """

        logger.info(
            "Processing request | conversation=%s",
            conversation_id
        )


        # ========================================================
        # GET EXPLICIT AGENT
        # ========================================================

        requested_agent = kwargs.get(
            "agent_type"
        )


        if requested_agent:

            requested_agent = str(
                requested_agent
            ).strip().lower()


        # ========================================================
        # VALID AGENTS
        # ========================================================

        valid_agents = set(
            self.agents.keys()
        )


        # ========================================================
        # EXPLICIT AGENT SELECTED
        # ========================================================

        if requested_agent in valid_agents:

            intent = requested_agent

            logger.info(
                "Using explicitly selected agent: %s",
                intent
            )


        # ========================================================
        # NO VALID AGENT PROVIDED
        # ========================================================

        else:

            logger.info(
                "No valid explicit agent supplied. "
                "Using IntentClassifierAgent."
            )


            try:

                intent = self.classifier.run(
                    input_text,
                    conversation_id
                )

                intent = str(
                    intent
                ).strip().lower()

            except Exception as e:

                logger.error(
                    "Intent classification failed: %s",
                    str(e),
                    exc_info=True
                )

                intent = "chat"


        # ========================================================
        # SAFETY CHECK
        # ========================================================

        if intent not in valid_agents:

            logger.warning(
                "Unknown agent '%s'. "
                "Falling back to chat.",
                intent
            )

            intent = "chat"


        # ========================================================
        # GET AGENT
        # ========================================================

        agent = self.agents.get(
            intent
        )


        if agent is None:

            logger.error(
                "Agent '%s' was not found.",
                intent
            )

            agent = self.agents[
                "chat"
            ]

            intent = "chat"


        # ========================================================
        # LOG ROUTING
        # ========================================================

        logger.info(
            "Executing agent: %s",
            intent
        )


        # ========================================================
        # EXECUTE AGENT
        # ========================================================

        try:

            result = agent.run(
                input_text,
                conversation_id,
                **kwargs
            )

        except Exception as e:

            logger.error(
                "Agent '%s' failed: %s",
                intent,
                str(e),
                exc_info=True
            )

            return {
                "response": (
                    "I encountered an error while "
                    f"executing the {intent} agent: "
                    f"{str(e)}"
                ),

                "agent_used":
                    intent,

                "sources": [],
            }


        # ========================================================
        # SAFETY: NORMALIZE RESULT
        # ========================================================

        if not isinstance(
            result,
            dict
        ):

            result = {
                "response":
                    str(result)
            }


        # ========================================================
        # SET ACTUAL AGENT
        # ========================================================

        result["agent_used"] = intent


        # ========================================================
        # NORMALIZE SOURCES
        # ========================================================

        if not isinstance(
            result.get("sources"),
            list
        ):

            result["sources"] = []


        # ========================================================
        # LOG RESULT
        # ========================================================

        logger.info(
            "Agent execution completed | "
            "agent=%s | sources=%d",
            intent,
            len(
                result.get(
                    "sources",
                    []
                )
            )
        )


        return result


# ============================================================
# GLOBAL WORKFLOW ORCHESTRATOR
# ============================================================

workflow_orchestrator = (
    WorkflowOrchestrator()
)