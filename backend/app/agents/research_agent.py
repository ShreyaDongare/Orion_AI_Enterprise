from typing import Dict, Any
from app.agents.base_agent import BaseAgent
from app.prompts.agent_prompts import RESEARCH_AGENT_PROMPT
from app.tools.search import web_search
from app.agents.memory import ConversationMemory
from langchain.agents import create_tool_calling_agent, AgentExecutor
import logging

logger = logging.getLogger(__name__)

class ResearchAgent(BaseAgent):
    def __init__(self):
        super().__init__(agent_type="research")
        self.tools = [web_search]
        
        agent = create_tool_calling_agent(self.llm, self.tools, RESEARCH_AGENT_PROMPT)
        self.agent_executor = AgentExecutor(agent=agent, tools=self.tools, verbose=True)

    def run(self, input_text: str, conversation_id: str, **kwargs) -> Dict[str, Any]:
        try:
            history = ConversationMemory.get_history(conversation_id)
            result = self.agent_executor.invoke({
                "input": input_text,
                "history": history
            })
            return {"response": result["output"]}
        except Exception as e:
            logger.error(f"Research agent failed: {e}")
            return {"response": f"I encountered an error during research: {str(e)}"}
