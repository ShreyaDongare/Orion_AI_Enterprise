from uuid import UUID
import logging

from flask import request
from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.core import Project


logger = logging.getLogger(__name__)


# ============================================================
# PROJECT BLUEPRINT
# ============================================================

blp = Blueprint(
    "projects",
    "projects",
    url_prefix="/api/v1/projects",
    description="Project management operations",
)


# ============================================================
# SERIALIZE PROJECT
# ============================================================

def serialize_project(project):
    """
    Convert a Project SQLAlchemy object into
    the response format expected by the frontend.
    """

    conversations = project.conversations or []

    return {
        "id": str(project.id),

        "name": project.name,

        "description": project.description or "",

        "status": "active",

        "conversations_count": len(
            conversations
        ),

        # Project currently has no direct
        # document relationship in the database.
        #
        # Knowledge documents belong to
        # KnowledgeCollection, not Project.
        #
        # Therefore we do not invent a document count.
        "documents_count": 0,

        "created_at": (
            project.created_at.isoformat()
            if project.created_at
            else None
        ),

        "updated_at": (
            project.updated_at.isoformat()
            if project.updated_at
            else None
        ),
    }


# ============================================================
# PROJECT COLLECTION
# ============================================================

@blp.route("")
class ProjectCollection(MethodView):

    # ========================================================
    # GET PROJECTS
    # ========================================================

    @jwt_required()
    @blp.response(200)
    def get(self):
        """
        Return all projects owned by the
        currently authenticated user.
        """

        try:

            user_id = get_jwt_identity()

            if not user_id:
                abort(
                    401,
                    message="Authentication required."
                )

            try:
                user_uuid = UUID(
                    str(user_id)
                )

            except (
                ValueError,
                TypeError
            ):

                abort(
                    401,
                    message="Invalid authenticated user."
                )

            projects = (
                Project.query
                .filter_by(
                    owner_id=user_uuid
                )
                .order_by(
                    Project.created_at.desc()
                )
                .all()
            )

            return [
                serialize_project(project)
                for project in projects
            ]

        except Exception as e:

            # Do not convert our HTTP aborts
            # into generic 500 errors.
            if getattr(e, "code", None):
                raise

            logger.error(
                "Failed to load projects: %s",
                str(e),
                exc_info=True,
            )

            abort(
                500,
                message="Failed to load projects."
            )

    # ========================================================
    # CREATE PROJECT
    # ========================================================

    @jwt_required()
    @blp.response(201)
    def post(self):
        """
        Create a new project for the
        currently authenticated user.
        """

        user_id = get_jwt_identity()

        if not user_id:
            abort(
                401,
                message="Authentication required."
            )

        try:

            owner_uuid = UUID(
                str(user_id)
            )

        except (
            ValueError,
            TypeError
        ):

            abort(
                401,
                message="Invalid authenticated user."
            )

        data = request.get_json(
            silent=True
        ) or {}

        name = data.get("name")

        description = data.get(
            "description",
            ""
        )

        # ----------------------------------------------------
        # Validate project name
        # ----------------------------------------------------

        if not name or not str(name).strip():

            abort(
                400,
                message="Project name is required."
            )

        name = str(name).strip()

        # ----------------------------------------------------
        # Validate description
        # ----------------------------------------------------

        if description is None:
            description = ""

        description = str(
            description
        ).strip()

        # ----------------------------------------------------
        # Create project
        # ----------------------------------------------------

        project = Project(
            name=name,
            description=description,
            owner_id=owner_uuid,
        )

        db.session.add(project)

        try:

            db.session.commit()

        except Exception as e:

            db.session.rollback()

            logger.error(
                "Failed to create project: %s",
                str(e),
                exc_info=True,
            )

            abort(
                500,
                message="Failed to create project."
            )

        logger.info(
            "Project created: %s",
            project.id,
        )

        return serialize_project(
            project
        ), 201


# ============================================================
# SINGLE PROJECT
# ============================================================

@blp.route("/<project_id>")
class ProjectResource(MethodView):

    # ========================================================
    # GET PROJECT
    # ========================================================

    @jwt_required()
    @blp.response(200)
    def get(self, project_id):
        """
        Return one project owned by the
        currently authenticated user.
        """

        user_id = get_jwt_identity()

        if not user_id:
            abort(
                401,
                message="Authentication required."
            )

        # ----------------------------------------------------
        # Validate project UUID
        # ----------------------------------------------------

        try:

            project_uuid = UUID(
                str(project_id)
            )

        except (
            ValueError,
            TypeError
        ):

            abort(
                422,
                message="Invalid project_id."
            )

        # ----------------------------------------------------
        # Validate user UUID
        # ----------------------------------------------------

        try:

            owner_uuid = UUID(
                str(user_id)
            )

        except (
            ValueError,
            TypeError
        ):

            abort(
                401,
                message="Invalid authenticated user."
            )

        # ----------------------------------------------------
        # Find project belonging to user
        # ----------------------------------------------------

        project = (
            Project.query
            .filter_by(
                id=project_uuid,
                owner_id=owner_uuid,
            )
            .first()
        )

        if not project:

            abort(
                404,
                message="Project not found."
            )

        return serialize_project(
            project
        )

    # ========================================================
    # UPDATE PROJECT
    # ========================================================

    @jwt_required()
    @blp.response(200)
    def put(self, project_id):
        """
        Update a project owned by the
        currently authenticated user.
        """

        user_id = get_jwt_identity()

        if not user_id:
            abort(
                401,
                message="Authentication required."
            )

        # ----------------------------------------------------
        # Validate project UUID
        # ----------------------------------------------------

        try:

            project_uuid = UUID(
                str(project_id)
            )

        except (
            ValueError,
            TypeError
        ):

            abort(
                422,
                message="Invalid project_id."
            )

        # ----------------------------------------------------
        # Validate user UUID
        # ----------------------------------------------------

        try:

            owner_uuid = UUID(
                str(user_id)
            )

        except (
            ValueError,
            TypeError
        ):

            abort(
                401,
                message="Invalid authenticated user."
            )

        # ----------------------------------------------------
        # Find project
        # ----------------------------------------------------

        project = (
            Project.query
            .filter_by(
                id=project_uuid,
                owner_id=owner_uuid,
            )
            .first()
        )

        if not project:

            abort(
                404,
                message="Project not found."
            )

        # ----------------------------------------------------
        # Read request
        # ----------------------------------------------------

        data = request.get_json(
            silent=True
        ) or {}

        # ----------------------------------------------------
        # Update name
        # ----------------------------------------------------

        if "name" in data:

            name = data.get("name")

            if not name or not str(name).strip():

                abort(
                    400,
                    message="Project name cannot be empty."
                )

            project.name = str(
                name
            ).strip()

        # ----------------------------------------------------
        # Update description
        # ----------------------------------------------------

        if "description" in data:

            description = data.get(
                "description"
            )

            project.description = (
                str(description).strip()
                if description is not None
                else ""
            )

        # ----------------------------------------------------
        # Save changes
        # ----------------------------------------------------

        try:

            db.session.commit()

        except Exception as e:

            db.session.rollback()

            logger.error(
                "Failed to update project: %s",
                str(e),
                exc_info=True,
            )

            abort(
                500,
                message="Failed to update project."
            )

        logger.info(
            "Project updated: %s",
            project.id,
        )

        return serialize_project(
            project
        )

    # ========================================================
    # DELETE PROJECT
    # ========================================================

    @jwt_required()
    @blp.response(204)
    def delete(self, project_id):
        """
        Delete a project owned by the
        currently authenticated user.
        """

        user_id = get_jwt_identity()

        if not user_id:
            abort(
                401,
                message="Authentication required."
            )

        # ----------------------------------------------------
        # Validate project UUID
        # ----------------------------------------------------

        try:

            project_uuid = UUID(
                str(project_id)
            )

        except (
            ValueError,
            TypeError
        ):

            abort(
                422,
                message="Invalid project_id."
            )

        # ----------------------------------------------------
        # Validate user UUID
        # ----------------------------------------------------

        try:

            owner_uuid = UUID(
                str(user_id)
            )

        except (
            ValueError,
            TypeError
        ):

            abort(
                401,
                message="Invalid authenticated user."
            )

        # ----------------------------------------------------
        # Find project
        # ----------------------------------------------------

        project = (
            Project.query
            .filter_by(
                id=project_uuid,
                owner_id=owner_uuid,
            )
            .first()
        )

        if not project:

            abort(
                404,
                message="Project not found."
            )

        # ----------------------------------------------------
        # Delete
        # ----------------------------------------------------

        try:

            db.session.delete(
                project
            )

            db.session.commit()

        except Exception as e:

            db.session.rollback()

            logger.error(
                "Failed to delete project: %s",
                str(e),
                exc_info=True,
            )

            abort(
                500,
                message="Failed to delete project."
            )

        logger.info(
            "Project deleted: %s",
            project_id,
        )

        return ""