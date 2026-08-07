from typing import Dict, Any
from app.agents.base_agent import BaseAgent
from app.prompts.agent_prompts import KNOWLEDGE_AGENT_PROMPT
from app.agents.memory import ConversationMemory
from app.rag.retrieval import RAGRetriever
from langchain_core.output_parsers import StrOutputParser
import logging

logger = logging.getLogger(__name__)

class KnowledgeAgent(BaseAgent):
    def __init__(self):
        super().__init__(agent_type="knowledge")
        self.retriever = RAGRetriever()
        self.chain = KNOWLEDGE_AGENT_PROMPT | self.llm | StrOutputParser()

    def run(self, input_text: str, conversation_id: str, **kwargs) -> Dict[str, Any]:
        try:
            # 1. Retrieve context
            context = self.retriever.get_context_string(query=input_text, top_k=5)
            
            # 2. Format history
            history = ConversationMemory.get_history(conversation_id)
            
            # 3. Generate response
            response = self.chain.invoke({
                "input": input_text,
                "history": history,
                "context": context
            })
            
            return {"response": response, "context_used": context}
        except Exception as e:
            logger.error(f"Knowledge agent failed: {e}")
            return {"response": f"I encountered an error retrieving knowledge: {str(e)}"}
