import logging
from typing import List, Dict, Any
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from app.rag.chroma_client import get_chroma_client, get_or_create_collection

logger = logging.getLogger(__name__)

class RAGRetriever:
    def __init__(self, collection_name: str = "orion_knowledge"):
        self.collection_name = collection_name
        self.embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

    def search(self, query: str, top_k: int = 5, filter_metadata: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Performs vector search in ChromaDB.
        """
        try:
            client = get_chroma_client()
            collection = get_or_create_collection(client, self.collection_name)
            
            query_embedding = self.embeddings.embed_query(query)
            
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=filter_metadata
            )
            
            if not results['documents'] or not results['documents'][0]:
                return []
                
            formatted_results = []
            for i in range(len(results['documents'][0])):
                formatted_results.append({
                    "content": results['documents'][0][i],
                    "metadata": results['metadatas'][0][i] if results['metadatas'] else {},
                    "distance": results['distances'][0][i] if 'distances' in results else None,
                    "id": results['ids'][0][i]
                })
                
            return formatted_results
        except Exception as e:
            logger.error(f"Error during RAG retrieval: {e}")
            return []

    def get_context_string(self, query: str, top_k: int = 5, filter_metadata: Dict[str, Any] = None) -> str:
        """Helper to get a concatenated string of context for LLM prompts."""
        results = self.search(query, top_k, filter_metadata)
        if not results:
            return "No relevant context found."
            
        context_parts = []
        for i, res in enumerate(results):
            source = res["metadata"].get("source", "Unknown source")
            context_parts.append(f"--- Document {i+1} (Source: {source}) ---\n{res['content']}\n")
            
        return "\n".join(context_parts)
