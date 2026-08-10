import os
import json
import logging
from uuid import UUID

from flask import request
from flask.views import MethodView
from flask_smorest import Blueprint, abort

from app.extensions import db
from app.models.knowledge import (
    KnowledgeCollection,
    Document,
    DocumentVersion,
)
from app.rag.ingestion import RAGIngestor


logger = logging.getLogger(__name__)


# ============================================================
# KNOWLEDGE BLUEPRINT
# ============================================================

blp = Blueprint(
    "knowledge",
    "knowledge",
    url_prefix="/api/v1/knowledge",
    description="Knowledge Base operations",
)


# ============================================================
# KNOWLEDGE COLLECTIONS
# ============================================================

@blp.route("/collections")
class KnowledgeCollections(MethodView):

    # ========================================================
    # GET COLLECTIONS
    # ========================================================

    @blp.response(200)
    def get(self):
        """
        Return all knowledge collections
        from PostgreSQL.
        """

        collections = (
            KnowledgeCollection.query
            .order_by(
                KnowledgeCollection.created_at.desc()
            )
            .all()
        )

        response = []

        for collection in collections:

            documents = []

            for document in collection.documents:

                # ------------------------------------------------
                # Get latest document version
                # ------------------------------------------------

                latest_version = None

                if document.versions:
                    latest_version = document.versions[0]

                # ------------------------------------------------
                # Calculate file size
                # ------------------------------------------------

                file_size = 0

                if (
                    latest_version
                    and latest_version.storage_path
                    and os.path.exists(
                        latest_version.storage_path
                    )
                ):
                    try:
                        file_size = os.path.getsize(
                            latest_version.storage_path
                        )
                    except OSError:
                        file_size = 0

                # ------------------------------------------------
                # Determine vector status
                # ------------------------------------------------

                vector_status = "Not Indexed"

                if (
                    latest_version
                    and latest_version.chroma_collection_id
                ):
                    vector_status = "Indexed"

                # ------------------------------------------------
                # Build document response
                # ------------------------------------------------

                documents.append(
                    {
                        "id": str(document.id),

                        "collection_id": str(
                            document.collection_id
                        ),

                        "title": document.title,

                        "file_type": document.file_type,

                        "tags": document.tags or [],

                        "size": file_size,

                        "vector_status": vector_status,

                        "created_at": (
                            document.created_at.isoformat()
                            if document.created_at
                            else None
                        ),

                        "updated_at": (
                            document.updated_at.isoformat()
                            if document.updated_at
                            else None
                        ),
                    }
                )

            # ----------------------------------------------------
            # Build collection response
            # ----------------------------------------------------

            response.append(
                {
                    "id": str(collection.id),

                    "name": collection.name,

                    "description": collection.description,

                    "documents_count": len(
                        documents
                    ),

                    "documents": documents,

                    "created_at": (
                        collection.created_at.isoformat()
                        if collection.created_at
                        else None
                    ),

                    "updated_at": (
                        collection.updated_at.isoformat()
                        if collection.updated_at
                        else None
                    ),
                }
            )

        return response


    # ========================================================
    # CREATE COLLECTION
    # ========================================================

    @blp.response(201)
    def post(self):
        """
        Create a new knowledge collection
        in PostgreSQL.
        """

        data = request.get_json(
            silent=True
        ) or {}

        name = data.get("name")

        description = data.get(
            "description"
        )

        # ----------------------------------------------------
        # Validate name
        # ----------------------------------------------------

        if not name or not str(name).strip():

            abort(
                400,
                message="Collection name is required."
            )

        name = str(name).strip()

        if description is not None:

            description = str(
                description
            ).strip()

        # ----------------------------------------------------
        # Create collection
        # ----------------------------------------------------

        collection = KnowledgeCollection(
            name=name,
            description=description,
        )

        db.session.add(collection)

        try:

            db.session.commit()

        except Exception as e:

            db.session.rollback()

            logger.error(
                "Failed to create knowledge collection: %s",
                str(e),
                exc_info=True,
            )

            abort(
                500,
                message="Failed to create knowledge collection."
            )

        logger.info(
            "Knowledge collection created: %s",
            collection.id,
        )

        # ----------------------------------------------------
        # Return collection
        # ----------------------------------------------------

        return {
            "id": str(collection.id),

            "name": collection.name,

            "description": collection.description,

            "documents_count": 0,

            "documents": [],

            "created_at": (
                collection.created_at.isoformat()
                if collection.created_at
                else None
            ),

            "updated_at": (
                collection.updated_at.isoformat()
                if collection.updated_at
                else None
            ),
        }, 201


# ============================================================
# KNOWLEDGE DOCUMENTS
# ============================================================

@blp.route("/documents")
class KnowledgeDocuments(MethodView):

    # ========================================================
    # UPLOAD DOCUMENT
    # ========================================================

    @blp.response(201)
    def post(self):
        """
        Upload a document, save its metadata
        in PostgreSQL, and ingest its content
        into ChromaDB.
        """

        # ----------------------------------------------------
        # Get collection ID
        # ----------------------------------------------------

        collection_id = request.form.get(
            "collection_id"
        )

        if not collection_id:

            abort(
                400,
                message="collection_id is required."
            )

        # ----------------------------------------------------
        # Validate UUID
        # ----------------------------------------------------

        try:

            collection_uuid = UUID(
                str(collection_id)
            )

        except (
            ValueError,
            TypeError
        ):

            abort(
                422,
                message="Invalid collection_id."
            )

        # ----------------------------------------------------
        # Find collection
        # ----------------------------------------------------

        collection = (
            KnowledgeCollection.query.get(
                collection_uuid
            )
        )

        if not collection:

            abort(
                404,
                message="Knowledge collection not found."
            )

        # ----------------------------------------------------
        # Get uploaded file
        # ----------------------------------------------------

        uploaded_file = request.files.get(
            "file"
        )

        if not uploaded_file:

            abort(
                400,
                message="No file uploaded."
            )

        if not uploaded_file.filename:

            abort(
                400,
                message="Uploaded file has no filename."
            )

        original_filename = (
            uploaded_file.filename
        )

        # ----------------------------------------------------
        # File extension
        # ----------------------------------------------------

        file_extension = os.path.splitext(
            original_filename
        )[1].lower()

        # ----------------------------------------------------
        # Upload directory
        # ----------------------------------------------------

        upload_dir = os.path.join(
            "uploads",
            "knowledge"
        )

        os.makedirs(
            upload_dir,
            exist_ok=True
        )

        # ----------------------------------------------------
        # Generate unique filename
        # ----------------------------------------------------

        stored_filename = (
            f"{os.urandom(16).hex()}"
            f"{file_extension}"
        )

        storage_path = os.path.join(
            upload_dir,
            stored_filename
        )

        # ----------------------------------------------------
        # Save physical file
        # ----------------------------------------------------

        try:

            uploaded_file.save(
                storage_path
            )

            logger.info(
                "Knowledge document uploaded: %s",
                storage_path
            )

        except Exception as e:

            logger.error(
                "Failed to save uploaded file: %s",
                str(e),
                exc_info=True
            )

            abort(
                500,
                message="Failed to save uploaded file."
            )

        # ----------------------------------------------------
        # Parse tags
        # ----------------------------------------------------

        tags_raw = request.form.get(
            "tags",
            "[]"
        )

        try:

            tags = json.loads(
                tags_raw
            )

            if not isinstance(
                tags,
                list
            ):

                tags = []

        except Exception:

            tags = []

        # ----------------------------------------------------
        # Create Document
        # ----------------------------------------------------

        document = Document(
            collection_id=collection.id,

            title=original_filename,

            file_type=(
                file_extension
                .lstrip(".")
                .lower()
            ),

            tags=tags,
        )

        db.session.add(
            document
        )

        db.session.flush()

        # ----------------------------------------------------
        # Create Document Version
        # ----------------------------------------------------

        document_version = DocumentVersion(
            document_id=document.id,

            version_number=1,

            storage_path=storage_path,

            checksum=None,

            chroma_collection_id=None,
        )

        db.session.add(
            document_version
        )

        try:

            db.session.commit()

        except Exception as e:

            db.session.rollback()

            if os.path.exists(
                storage_path
            ):

                try:

                    os.remove(
                        storage_path
                    )

                except Exception:
                    pass

            logger.error(
                "Failed to save document metadata: %s",
                str(e),
                exc_info=True
            )

            abort(
                500,
                message="Failed to save document metadata."
            )

        # ====================================================
        # RAG INGESTION
        # ====================================================

        try:

            logger.info(
                "Starting RAG ingestion for: %s",
                original_filename
            )

            ingestor = RAGIngestor(
                collection_name="orion_knowledge"
            )

            chunk_ids = (
                ingestor.ingest_file(
                    file_path=storage_path,

                    metadata={
                        "source": original_filename,

                        "document_id": str(
                            document.id
                        ),

                        "collection_id": str(
                            collection.id
                        ),

                        "document_version_id": str(
                            document_version.id
                        ),
                    },
                )
            )

            # ------------------------------------------------
            # Verify ingestion
            # ------------------------------------------------

            if not chunk_ids:

                raise ValueError(
                    "No chunks were created during "
                    "RAG ingestion."
                )

            # ------------------------------------------------
            # Save Chroma reference
            # ------------------------------------------------

            document_version.chroma_collection_id = (
                "orion_knowledge"
            )

            db.session.commit()

            logger.info(
                "Document successfully indexed. "
                "Chunks: %d",
                len(chunk_ids)
            )

        except Exception as e:

            logger.error(
                "RAG ingestion failed: %s",
                str(e),
                exc_info=True
            )

            db.session.rollback()

            # ------------------------------------------------
            # Delete uploaded file
            # ------------------------------------------------

            if os.path.exists(
                storage_path
            ):

                try:

                    os.remove(
                        storage_path
                    )

                except Exception as delete_error:

                    logger.warning(
                        "Could not remove failed "
                        "upload: %s",
                        delete_error
                    )

            abort(
                500,
                message=(
                    "Document was uploaded but "
                    "RAG ingestion failed: "
                    f"{str(e)}"
                )
            )

        # ====================================================
        # CALCULATE FILE SIZE
        # ====================================================

        file_size = 0

        if os.path.exists(
            storage_path
        ):

            try:

                file_size = os.path.getsize(
                    storage_path
                )

            except OSError:

                file_size = 0

        # ====================================================
        # RETURN DOCUMENT
        # ====================================================

        return {
            "id": str(
                document.id
            ),

            "collection_id": str(
                document.collection_id
            ),

            "title": document.title,

            "file_type": document.file_type,

            "tags": document.tags or [],

            "size": file_size,

            "vector_status": "Indexed",

            "status": "indexed",

            "chunks": len(
                chunk_ids
            ),

            "created_at": (
                document.created_at.isoformat()
                if document.created_at
                else None
            ),

            "updated_at": (
                document.updated_at.isoformat()
                if document.updated_at
                else None
            ),

        }, 201


# ============================================================
# DELETE DOCUMENT
# ============================================================

@blp.route(
    "/documents/<document_id>"
)
class KnowledgeDocument(MethodView):

    # ========================================================
    # DELETE DOCUMENT
    # ========================================================

    @blp.response(204)
    def delete(
        self,
        document_id
    ):
        """
        Delete a document and its stored files.
        """

        # ----------------------------------------------------
        # Validate document UUID
        # ----------------------------------------------------

        try:

            document_uuid = UUID(
                str(document_id)
            )

        except (
            ValueError,
            TypeError
        ):

            abort(
                422,
                message="Invalid document_id."
            )

        # ----------------------------------------------------
        # Find document
        # ----------------------------------------------------

        document = Document.query.get(
            document_uuid
        )

        if not document:

            abort(
                404,
                message="Document not found."
            )

        # ----------------------------------------------------
        # Delete physical files
        # ----------------------------------------------------

        for version in (
            document.versions
        ):

            if (
                version.storage_path
                and os.path.exists(
                    version.storage_path
                )
            ):

                try:

                    os.remove(
                        version.storage_path
                    )

                except Exception as e:

                    logger.warning(
                        "Could not delete file: %s",
                        e
                    )

        # ----------------------------------------------------
        # Delete database document
        # ----------------------------------------------------

        try:

            db.session.delete(
                document
            )

            db.session.commit()

        except Exception as e:

            db.session.rollback()

            logger.error(
                "Failed to delete document: %s",
                str(e),
                exc_info=True
            )

            abort(
                500,
                message="Failed to delete document."
            )

        logger.info(
            "Knowledge document deleted: %s",
            document_id
        )

        return ""