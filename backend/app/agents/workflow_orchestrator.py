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
        self.classifier = IntentClassifierAgent()
        
        # Instantiate agents lazily or keep them cached
        self.agents = {
            "research": ResearchAgent(),
            "chat": ChatAgent(),
            "knowledge": KnowledgeAgent(),
            "data_analysis": DataAnalysisAgent(),
            "report": ReportAgent(),
            "presentation": PresentationAgent(),
            "email": EmailAgent(),
            "executive": ExecutiveAgent()
        }

    def process_request(self, input_text: str, conversation_id: str, **kwargs) -> Dict[str, Any]:
        """
        Main entrypoint for processing user input. 
        Routes to the correct agent based on intent.
        """
        logger.info(f"Processing request for conversation {conversation_id}")
        
        # 1. Classify Intent
        intent = self.classifier.run(input_text, conversation_id)
        logger.info(f"Classified intent: {intent}")
        
        # 2. Get Agent
        agent = self.agents.get(intent, self.agents["chat"])
        
        # 3. Execute Agent
        result = agent.run(input_text, conversation_id, **kwargs)
        result["agent_used"] = intent
        return result

workflow_orchestrator = WorkflowOrchestrator()
