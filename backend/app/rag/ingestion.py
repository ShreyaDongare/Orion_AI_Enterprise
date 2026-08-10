import uuid
import logging
import os
from typing import List, Dict, Any, Optional

from langchain_text_splitters import RecursiveCharacterTextSplitter
from google import genai
from google.genai import types

from app.rag.chroma_client import (
    get_chroma_client,
    get_or_create_collection,
)

from app.utils.file_parser import InputNormalizer

logger = logging.getLogger(__name__)


class RAGIngestor:
    """
    Handles document ingestion for OrionAI RAG.

    Flow:

        File
          ↓
        Text extraction
          ↓
        Text chunks
          ↓
        Gemini embeddings
          ↓
        ChromaDB
    """

    def __init__(
        self,
        collection_name: str = "orion_knowledge",
    ):
        self.collection_name = collection_name

        # Current Gemini embedding model
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

        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=[
                "\n\n",
                "\n",
                " ",
                "",
            ],
        )

        logger.info(
            "RAGIngestor initialized | collection=%s | embedding=%s",
            self.collection_name,
            self.embedding_model,
        )

    # =========================================================
    # INGEST FILE
    # =========================================================

    def ingest_file(
        self,
        file_path: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[str]:
        """
        Extract text from a file and store it in ChromaDB.
        """

        if metadata is None:
            metadata = {}

        logger.info(
            "Starting document ingestion | file=%s",
            file_path,
        )

        # -----------------------------------------------------
        # Extract text
        # -----------------------------------------------------

        try:
            extraction = (
                InputNormalizer.extract_text_from_file(
                    file_path
                )
            )
        except Exception as e:
            logger.error(
                "File text extraction failed: %s",
                str(e),
                exc_info=True,
            )
            raise

        if not extraction:
            logger.warning(
                "File extraction returned no result | file=%s",
                file_path,
            )
            return []

        extraction_metadata = extraction.get(
            "metadata",
            {},
        )

        if "error" in extraction_metadata:
            error_message = extraction_metadata["error"]

            logger.error(
                "Document extraction failed: %s",
                error_message,
            )

            return []

        text = extraction.get(
            "text",
            "",
        )

        if not text or not text.strip():
            logger.warning(
                "No text extracted from file | file=%s",
                file_path,
            )
            return []

        logger.info(
            "Text extraction successful | characters=%d",
            len(text),
        )

        # -----------------------------------------------------
        # Add source metadata
        # -----------------------------------------------------

        clean_input_metadata = dict(metadata)

        clean_input_metadata["source"] = (
            clean_input_metadata.get(
                "source",
                file_path,
            )
        )

        clean_input_metadata["file_path"] = file_path

        return self.ingest_text(
            text=text,
            metadata=clean_input_metadata,
        )

    # =========================================================
    # INGEST TEXT
    # =========================================================

    def ingest_text(
        self,
        text: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[str]:
        """
        Split text, generate embeddings, and store
        the chunks in ChromaDB.
        """

        if metadata is None:
            metadata = {}

        # -----------------------------------------------------
        # Validate text
        # -----------------------------------------------------

        if not text or not text.strip():
            logger.warning(
                "Cannot ingest empty text."
            )
            return []

        # -----------------------------------------------------
        # Split document
        # -----------------------------------------------------

        chunks = self.text_splitter.split_text(
            text
        )

        chunks = [
            chunk.strip()
            for chunk in chunks
            if chunk and chunk.strip()
        ]

        if not chunks:
            logger.warning(
                "Text splitter produced zero chunks."
            )
            return []

        logger.info(
            "Document split into %d chunks | collection=%s",
            len(chunks),
            self.collection_name,
        )

        # -----------------------------------------------------
        # Clean metadata for ChromaDB
        # -----------------------------------------------------

        clean_metadata: Dict[str, Any] = {}

        for key, value in metadata.items():

            if isinstance(
                value,
                (str, int, float, bool),
            ):
                clean_metadata[key] = value

            elif value is None:
                continue

            else:
                clean_metadata[key] = str(value)

        metadatas = [
            clean_metadata.copy()
            for _ in chunks
        ]

        # -----------------------------------------------------
        # Generate unique IDs
        # -----------------------------------------------------

        ids = [
            str(uuid.uuid4())
            for _ in chunks
        ]

        try:

            # =================================================
            # CONNECT TO CHROMADB
            # =================================================

            client = get_chroma_client()

            collection = get_or_create_collection(
                client,
                self.collection_name,
            )

            before_count = collection.count()

            logger.info(
                "ChromaDB collection '%s' currently contains %d chunks",
                self.collection_name,
                before_count,
            )

            # =================================================
            # GENERATE GEMINI EMBEDDINGS
            # =================================================

            logger.info(
                "Generating embeddings | chunks=%d | model=%s",
                len(chunks),
                self.embedding_model,
            )

            embedding_response = (
                self.genai_client.models.embed_content(
                    model=self.embedding_model,
                    contents=chunks,
                    config=types.EmbedContentConfig(
                        task_type="RETRIEVAL_DOCUMENT"
                    ),
                )
            )

            embedded_docs = [
                embedding.values
                for embedding in (
                    embedding_response.embeddings or []
                )
            ]

            # -------------------------------------------------
            # Validate embeddings
            # -------------------------------------------------

            if not embedded_docs:
                raise ValueError(
                    "Gemini returned no embeddings."
                )

            if len(embedded_docs) != len(chunks):
                raise ValueError(
                    "Number of embeddings does not "
                    "match number of chunks."
                )

            logger.info(
                "Generated %d embeddings successfully",
                len(embedded_docs),
            )

            # =================================================
            # INSERT INTO CHROMADB
            # =================================================

            collection.add(
                ids=ids,
                embeddings=embedded_docs,
                documents=chunks,
                metadatas=metadatas,
            )

            # =================================================
            # VERIFY INSERTION
            # =================================================

            after_count = collection.count()

            logger.info(
                "ChromaDB insertion successful | "
                "before=%d | after=%d | added=%d",
                before_count,
                after_count,
                after_count - before_count,
            )

            if after_count < before_count + len(chunks):
                logger.warning(
                    "Expected %d new chunks but collection "
                    "contains only %d additional chunks.",
                    len(chunks),
                    after_count - before_count,
                )

            return ids

        except Exception as e:

            logger.error(
                "RAG ingestion failed: %s",
                str(e),
                exc_info=True,
            )

            raise