import logging
import os
from typing import List, Dict, Any, Optional

from google import genai
from google.genai import types

from app.rag.chroma_client import (
    get_chroma_client,
    get_or_create_collection,
)

logger = logging.getLogger(__name__)


class RAGRetriever:
    """
    Retrieves relevant documents from the OrionAI
    ChromaDB knowledge collection.
    """

    def __init__(
        self,
        collection_name: str = "orion_knowledge",
    ):
        self.collection_name = collection_name

        # IMPORTANT:
        # Must be the SAME embedding model used
        # by RAGIngestor.
        self.embedding_model = "gemini-embedding-001"

        # Google GenAI client
        api_key = (
            os.getenv("GEMINI_API_KEY")
            or os.getenv("GOOGLE_API_KEY")
        )

        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY or GOOGLE_API_KEY "
                "is not configured."
            )

        self.genai_client = genai.Client(
            api_key=api_key
        )

        logger.info(
            "RAGRetriever initialized | collection=%s | embedding=%s",
            self.collection_name,
            self.embedding_model,
        )

    # =========================================================
    # SEARCH CHROMADB
    # =========================================================

    def search(
        self,
        query: str,
        top_k: int = 5,
        filter_metadata: Optional[
            Dict[str, Any]
        ] = None,
    ) -> List[Dict[str, Any]]:
        """
        Perform vector similarity search in ChromaDB.
        """

        if not query or not query.strip():
            logger.warning(
                "RAG search called with empty query."
            )
            return []

        try:

            # =================================================
            # CONNECT TO CHROMADB
            # =================================================

            client = get_chroma_client()

            collection = get_or_create_collection(
                client,
                self.collection_name,
            )

            # =================================================
            # CHECK COLLECTION SIZE
            # =================================================

            collection_count = collection.count()

            logger.info(
                "RAG collection '%s' contains %d documents.",
                self.collection_name,
                collection_count,
            )

            # =================================================
            # EMPTY COLLECTION
            # =================================================

            if collection_count == 0:

                logger.warning(
                    "RAG collection '%s' is EMPTY.",
                    self.collection_name,
                )

                return []

            # =================================================
            # CREATE QUERY EMBEDDING
            # =================================================

            logger.info(
                "Creating query embedding | model=%s | query=%s",
                self.embedding_model,
                query,
            )

            embedding_response = (
                self.genai_client.models.embed_content(
                    model=self.embedding_model,
                    contents=query.strip(),
                    config=types.EmbedContentConfig(
                        task_type="RETRIEVAL_QUERY"
                    ),
                )
            )

            embeddings = (
                embedding_response.embeddings or []
            )

            if not embeddings:
                logger.warning(
                    "Gemini returned no query embedding."
                )
                return []

            query_embedding = embeddings[0].values

            if not query_embedding:
                logger.warning(
                    "Gemini returned an empty query embedding."
                )
                return []

            # =================================================
            # PREPARE CHROMADB QUERY
            # =================================================

            n_results = min(
                max(top_k, 1),
                collection_count,
            )

            query_args = {
                "query_embeddings": [
                    query_embedding
                ],
                "n_results": n_results,
            }

            if filter_metadata:
                query_args["where"] = filter_metadata

            # =================================================
            # EXECUTE VECTOR SEARCH
            # =================================================

            results = collection.query(
                **query_args
            )

            documents = (
                results.get("documents")
                or []
            )

            ids = (
                results.get("ids")
                or []
            )

            metadatas = (
                results.get("metadatas")
                or []
            )

            distances = (
                results.get("distances")
                or []
            )

            # =================================================
            # NO RESULTS
            # =================================================

            if (
                not documents
                or not documents[0]
            ):

                logger.warning(
                    "No documents found for query: %s",
                    query,
                )

                return []

            # =================================================
            # FORMAT RESULTS
            # =================================================

            formatted_results = []

            for index, document in enumerate(
                documents[0]
            ):

                if not document:
                    continue

                metadata = {}

                if (
                    metadatas
                    and len(metadatas) > 0
                    and len(metadatas[0]) > index
                    and metadatas[0][index]
                ):
                    metadata = (
                        metadatas[0][index]
                    )

                distance = None

                if (
                    distances
                    and len(distances) > 0
                    and len(distances[0]) > index
                ):
                    distance = (
                        distances[0][index]
                    )

                document_id = None

                if (
                    ids
                    and len(ids) > 0
                    and len(ids[0]) > index
                ):
                    document_id = (
                        ids[0][index]
                    )

                formatted_results.append(
                    {
                        "id": document_id,
                        "content": document,
                        "metadata": metadata,
                        "distance": distance,
                    }
                )

            # =================================================
            # LOG RETRIEVAL
            # =================================================

            logger.info(
                "RAG retrieved %d document(s) for query: %s",
                len(formatted_results),
                query,
            )

            for index, result in enumerate(
                formatted_results,
                start=1,
            ):

                logger.info(
                    "Result %d | id=%s | distance=%s | source=%s",
                    index,
                    result.get("id"),
                    result.get("distance"),
                    (
                        result.get(
                            "metadata",
                            {},
                        ).get(
                            "source",
                            "Unknown",
                        )
                    ),
                )

            return formatted_results

        except Exception as e:

            logger.error(
                "Error during RAG retrieval: %s",
                str(e),
                exc_info=True,
            )

            return []

    # =========================================================
    # BUILD CONTEXT FOR KNOWLEDGE AGENT
    # =========================================================

    def get_context_string(
        self,
        query: str,
        top_k: int = 5,
        filter_metadata: Optional[
            Dict[str, Any]
        ] = None,
    ) -> str:
        """
        Retrieve relevant documents and combine them
        into a context string for the Knowledge Agent.

        Returns an empty string when no documents are found.
        """

        results = self.search(
            query=query,
            top_k=top_k,
            filter_metadata=filter_metadata,
        )

        # =====================================================
        # NO RESULTS
        # =====================================================

        if not results:

            logger.warning(
                "No knowledge context available for query: %s",
                query,
            )

            return ""

        # =====================================================
        # BUILD CONTEXT
        # =====================================================

        context_parts = []

        for index, result in enumerate(
            results,
            start=1,
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

        # =====================================================
        # NO VALID CONTENT
        # =====================================================

        if not context_parts:

            logger.warning(
                "Retrieved results contained no usable text."
            )

            return ""

        context = "\n".join(
            context_parts
        )

        logger.info(
            "Knowledge context created successfully | "
            "documents=%d | context_length=%d",
            len(context_parts),
            len(context),
        )

        return context