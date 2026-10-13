from typing import Dict, Any
import logging
import json
from datetime import datetime, timezone
from uuid import UUID

from app.agents.intent_classifier import IntentClassifierAgent
from app.agents.research_agent import ResearchAgent
from app.agents.chat_agent import ChatAgent
from app.agents.knowledge_agent import KnowledgeAgent
from app.agents.data_analysis_agent import DataAnalysisAgent
from app.agents.report_agent import ReportAgent
from app.agents.presentation_agent import PresentationAgent
from app.agents.email_agent import EmailAgent
from app.agents.executive_agent import ExecutiveAgent

from app.extensions import db
from app.models.system import AgentExecution
from app.models.core import Conversation, Project


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
    # CREATE AGENT EXECUTION RECORD
    # ============================================================

    def _create_execution(
        self,
        agent_type: str,
        conversation_id: str,
        input_data: Dict[str, Any],
    ):

        """
        Create a real PostgreSQL agent_executions record.

        This allows the Analytics page to display:
        - Agent
        - Status
        - Input
        - Start time
        - Completion time
        - Output
        - Errors
        """

        try:

            conversation_uuid = UUID(str(conversation_id))
            conversation = Conversation.query.get(conversation_uuid)
            owner_id = (
                conversation.project.owner_id
                if conversation and conversation.project
                else None
            )
            execution = AgentExecution(
                agent_type=agent_type,
                user_id=owner_id,
                conversation_id=conversation_uuid,
                status="running",
                input_data=self._safe_json(
                    input_data
                ),
                started_at=datetime.now(
                    timezone.utc
                ),
            )

            db.session.add(
                execution
            )

            db.session.commit()

            return execution

        except Exception as e:

            logger.error(
                "Failed to create agent execution record: %s",
                str(e),
                exc_info=True,
            )

            db.session.rollback()

            return None

    # ============================================================
    # UPDATE AGENT EXECUTION - SUCCESS
    # ============================================================

    def _complete_execution(
        self,
        execution,
        result,
    ):

        if execution is None:
            return

        try:

            execution.status = "completed"

            execution.output_data = (
                self._safe_json(result)
            )

            execution.completed_at = (
                datetime.now(timezone.utc)
            )

            db.session.commit()

        except Exception as e:

            logger.error(
                "Failed to complete agent execution: %s",
                str(e),
                exc_info=True,
            )

            db.session.rollback()

    # ============================================================
    # UPDATE AGENT EXECUTION - FAILURE
    # ============================================================

    def _fail_execution(
        self,
        execution,
        error,
    ):

        if execution is None:
            return

        try:

            execution.status = "failed"

            execution.error_message = str(
                error
            )

            execution.completed_at = (
                datetime.now(timezone.utc)
            )

            db.session.commit()

        except Exception as e:

            logger.error(
                "Failed to update failed execution: %s",
                str(e),
                exc_info=True,
            )

            db.session.rollback()

    # ============================================================
    # SAFE JSON SERIALIZATION
    # ============================================================

    @staticmethod
    def _safe_json(data):

        """
        Make sure JSON database fields only receive
        serializable data.
        """

        if data is None:
            return {}

        try:

            json.dumps(
                data,
                default=str
            )

            return data

        except (
            TypeError,
            ValueError
        ):

            return {
                "value": str(data)
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

        Otherwise, IntentClassifierAgent determines
        the appropriate agent.

        Every actual agent execution is recorded
        in PostgreSQL.
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
        # CREATE REAL EXECUTION RECORD
        # ========================================================

        execution_input = {

            "message":
                input_text,

            "conversation_id":
                str(conversation_id),

            "agent_type":
                intent,

            "rag_collection":
                kwargs.get(
                    "rag_collection"
                ),

            "project_id":
                kwargs.get(
                    "project_id"
                ),
        }

        execution = (
            self._create_execution(
                agent_type=intent,
                conversation_id=conversation_id,
                input_data=execution_input,
            )
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

            # -----------------------------------------------
            # SAVE FAILURE TO ANALYTICS
            # -----------------------------------------------

            self._fail_execution(
                execution,
                e
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

        result["agent_used"] = (
            intent
        )

        # ========================================================
        # NORMALIZE SOURCES
        # ========================================================

        if not isinstance(
            result.get("sources"),
            list
        ):

            result["sources"] = []

        # ========================================================
        # COMPLETE ANALYTICS RECORD
        # ========================================================

        self._complete_execution(
            execution,
            result
        )

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

        # ========================================================
        # RETURN RESULT
        # ========================================================

        return result


# ============================================================
# GLOBAL WORKFLOW ORCHESTRATOR
# ============================================================

workflow_orchestrator = (
    WorkflowOrchestrator()
)