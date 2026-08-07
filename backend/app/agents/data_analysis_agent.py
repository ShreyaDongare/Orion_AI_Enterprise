from typing import Dict, Any
from app.agents.base_agent import BaseAgent
from app.prompts.agent_prompts import DATA_ANALYSIS_AGENT_PROMPT
from app.tools.data_analysis import analyze_csv_data
from app.agents.memory import ConversationMemory
from langchain.agents import create_tool_calling_agent, AgentExecutor
import logging

logger = logging.getLogger(__name__)

class DataAnalysisAgent(BaseAgent):
    def __init__(self):
        super().__init__(agent_type="data_analysis")
        self.tools = [analyze_csv_data]
        
        agent = create_tool_calling_agent(self.llm, self.tools, DATA_ANALYSIS_AGENT_PROMPT)
        self.agent_executor = AgentExecutor(agent=agent, tools=self.tools, verbose=True)

    def run(self, input_text: str, conversation_id: str, **kwargs) -> Dict[str, Any]:
        try:
            # In a real scenario, the input_text might contain the CSV or we would 
            # pass file context from InputArtifacts to the prompt.
            # For this MVP, we rely on the normalizer to have appended the CSV to the input_text.
            history = ConversationMemory.get_history(conversation_id)
            result = self.agent_executor.invoke({
                "input": input_text,
                "history": history
            })
            return {"response": result["output"]}
        except Exception as e:
            logger.error(f"Data analysis agent failed: {e}")
            return {"response": f"Error during data analysis: {str(e)}"}
