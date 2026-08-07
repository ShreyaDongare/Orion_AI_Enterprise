import uuid
import logging
from typing import List, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from app.rag.chroma_client import get_chroma_client, get_or_create_collection
from app.utils.file_parser import InputNormalizer
import os

logger = logging.getLogger(__name__)

class RAGIngestor:
    def __init__(self, collection_name: str = "orion_knowledge"):
        self.collection_name = collection_name
        # Using Gemini embeddings
        self.embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", " ", ""]
        )

    def ingest_file(self, file_path: str, metadata: Dict[str, Any] = None) -> List[str]:
        """Extracts text from a file, chunks it, and stores it in ChromaDB."""
        if metadata is None:
            metadata = {}
            
        extraction = InputNormalizer.extract_text_from_file(file_path)
        if "error" in extraction.get("metadata", {}):
            logger.error(f"Ingestion failed: {extraction['metadata']['error']}")
            return []
            
        text = extraction["text"]
        if not text.strip():
            logger.warning(f"No text extracted from {file_path}")
            return []
            
        return self.ingest_text(text, metadata)

    def ingest_text(self, text: str, metadata: Dict[str, Any] = None) -> List[str]:
        """Chunks text, generates embeddings, and stores in ChromaDB."""
        if metadata is None:
            metadata = {}
            
        chunks = self.text_splitter.split_text(text)
        
        # Ensure metadata values are strings, ints, or floats (ChromaDB requirement)
        clean_metadata = {}
        for k, v in metadata.items():
            if isinstance(v, (str, int, float, bool)):
                clean_metadata[k] = v
            else:
                clean_metadata[k] = str(v)

        metadatas = [clean_metadata for _ in chunks]
        ids = [str(uuid.uuid4()) for _ in chunks]
        
        try:
            client = get_chroma_client()
            collection = get_or_create_collection(client, self.collection_name)
            
            # Note: Chroma HttpClient with langchain embeddings wrapper can be slightly tricky. 
            # We'll use the langchain embeddings to embed documents explicitly before adding to chroma
            embedded_docs = self.embeddings.embed_documents(chunks)
            
            collection.add(
                ids=ids,
                embeddings=embedded_docs,
                documents=chunks,
                metadatas=metadatas
            )
            logger.info(f"Successfully ingested {len(chunks)} chunks into {self.collection_name}.")
            return ids
        except Exception as e:
            logger.error(f"Error during ChromaDB ingestion: {e}")
            raise e
