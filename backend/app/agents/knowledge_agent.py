from typing import Dict, Any
import logging

from app.agents.base_agent import BaseAgent
from app.prompts.agent_prompts import KNOWLEDGE_AGENT_PROMPT
from app.agents.memory import ConversationMemory
from app.rag.retrieval import RAGRetriever

from langchain_core.output_parsers import StrOutputParser


logger = logging.getLogger(__name__)


class KnowledgeAgent(BaseAgent):

    # ============================================================
    # INITIALIZE
    # ============================================================

    def __init__(self):

        super().__init__(
            agent_type="knowledge"
        )

        self.retriever = RAGRetriever()

        self.chain = (
            KNOWLEDGE_AGENT_PROMPT
            | self.llm
            | StrOutputParser()
        )

    # ============================================================
    # RUN KNOWLEDGE AGENT
    # ============================================================

    def run(
        self,
        input_text: str,
        conversation_id: str,
        **kwargs
    ) -> Dict[str, Any]:

        try:

            # ====================================================
            # 1. RETRIEVE RELEVANT DOCUMENTS
            # ====================================================

            results = self.retriever.search(
                query=input_text,
                top_k=5
            )

            logger.info(
                "Knowledge retrieval completed | results=%d",
                len(results)
            )

            # ====================================================
            # 2. NO DOCUMENTS FOUND
            # ====================================================

            if not results:

                logger.info(
                    "No relevant knowledge documents found."
                )

                return {
                    "response": (
                        "I cannot find the answer in the "
                        "provided documents."
                    ),

                    "context_used": "",

                    "sources": []
                }

            # ====================================================
            # 3. BUILD CONTEXT FROM RETRIEVED RESULTS
            # ====================================================

            context_parts = []

            for index, result in enumerate(
                results,
                start=1
            ):

                content = (
                    result.get("content")
                    or ""
                ).strip()

                if not content:
                    continue

                metadata = (
                    result.get("metadata")
                    or {}
                )

                source = (
                    metadata.get("source")
                    or metadata.get("filename")
                    or metadata.get("file_name")
                    or "Unknown source"
                )

                context_parts.append(
                    f"--- Document {index} "
                    f"(Source: {source}) ---\n"
                    f"{content}\n"
                )

            context = "\n".join(
                context_parts
            )

            # ====================================================
            # 4. VALIDATE CONTEXT
            # ====================================================

            if not context.strip():

                logger.warning(
                    "Retrieved documents contained no usable context."
                )

                return {
                    "response": (
                        "I cannot find the answer in the "
                        "provided documents."
                    ),

                    "context_used": "",

                    "sources": []
                }

            logger.info(
                "Knowledge context created | "
                "documents=%d | context_length=%d",
                len(context_parts),
                len(context)
            )

            # ====================================================
            # 5. CONVERSATION HISTORY
            # ====================================================

            history = ConversationMemory.get_history(
                conversation_id
            )

            # ====================================================
            # 6. GENERATE ANSWER
            # ====================================================

            response = self.chain.invoke({
                "input": input_text,
                "history": history,
                "context": context
            })

            # ====================================================
            # 7. BUILD SOURCE INFORMATION
            # ====================================================

            sources = []

            seen_sources = set()

            for result in results:

                metadata = (
                    result.get("metadata")
                    or {}
                )

                source = (
                    metadata.get("source")
                    or metadata.get("filename")
                    or metadata.get("file_name")
                    or "Unknown source"
                )

                document_id = (
                    metadata.get("document_id")
                )

                distance = (
                    result.get("distance")
                )

                source_key = (
                    document_id
                    or source
                )

                # ----------------------------------------------
                # Avoid duplicate source entries
                # ----------------------------------------------

                if source_key in seen_sources:
                    continue

                seen_sources.add(
                    source_key
                )

                sources.append({
                    "document": source,

                    "document_id": document_id,

                    "distance": distance,

                    "chunks_retrieved": sum(
                        1
                        for item in results
                        if (
                            (
                                item.get("metadata")
                                or {}
                            ).get("document_id")
                            == document_id
                            if document_id
                            else (
                                (
                                    item.get("metadata")
                                    or {}
                                ).get("source")
                                == source
                            )
                        )
                    )
                })

            logger.info(
                "Knowledge sources prepared | sources=%d",
                len(sources)
            )

            # ====================================================
            # 8. RETURN ANSWER + CONTEXT + SOURCES
            # ====================================================

            return {
                "response": response,

                "context_used": context,

                "sources": sources
            }

        except Exception as e:

            logger.error(
                "Knowledge agent failed: %s",
                str(e),
                exc_info=True
            )

            return {
                "response": (
                    "I encountered an error retrieving "
                    f"knowledge: {str(e)}"
                ),

                "context_used": "",

                "sources": []
            }