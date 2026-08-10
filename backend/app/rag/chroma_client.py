import os
import logging

import chromadb
from chromadb.config import Settings
from flask import current_app


logger = logging.getLogger(__name__)


# ============================================================
# CHROMADB CLIENT
# ============================================================

def get_chroma_client():
    """
    Returns a local persistent ChromaDB client.

    ChromaDB data is stored inside:
        backend/chroma_local_data/

    Docker is NOT required.
    """

    path = os.path.abspath(
        os.path.join(
            current_app.root_path,
            "..",
            "chroma_local_data"
        )
    )

    os.makedirs(path, exist_ok=True)

    logger.info(
        "Initializing local ChromaDB | path=%s",
        path
    )

    client = chromadb.PersistentClient(
        path=path,
        settings=Settings(
            anonymized_telemetry=False
        )
    )

    logger.info(
        "Local ChromaDB initialized successfully."
    )

    return client


# ============================================================
# GET / CREATE COLLECTION
# ============================================================

def get_or_create_collection(
    client,
    collection_name: str
):
    """
    Gets an existing ChromaDB collection or creates it.

    Cosine similarity is used for vector retrieval.
    """

    try:

        collection = client.get_or_create_collection(
            name=collection_name,
            metadata={
                "hnsw:space": "cosine"
            }
        )

        logger.info(
            "ChromaDB collection '%s' ready | documents=%d",
            collection_name,
            collection.count()
        )

        return collection

    except Exception as e:

        logger.error(
            "Failed to get/create ChromaDB collection '%s': %s",
            collection_name,
            str(e),
            exc_info=True
        )

        raise