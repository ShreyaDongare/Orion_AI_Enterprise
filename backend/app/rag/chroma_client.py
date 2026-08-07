import chromadb
from chromadb.config import Settings
from flask import current_app

def get_chroma_client():
    """Initializes and returns a ChromaDB client based on config."""
    host = current_app.config.get('CHROMA_HOST', 'localhost')
    port = current_app.config.get('CHROMA_PORT', 8000)
    
    # We use the HTTP client to connect to the separate ChromaDB docker container
    client = chromadb.HttpClient(host=host, port=port, settings=Settings(allow_reset=True))
    return client

def get_or_create_collection(client, collection_name: str):
    """Gets or creates a ChromaDB collection."""
    return client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}
    )
