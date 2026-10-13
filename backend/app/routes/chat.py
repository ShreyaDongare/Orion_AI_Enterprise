from uuid import UUID
import logging
import re
from html import escape

from flask import request
from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.schemas.api_schemas import (
    ChatRequestSchema,
    ChatResponseSchema,
    ErrorResponseSchema,
)

from app.agents.workflow_orchestrator import workflow_orchestrator
from app.agents.memory import ConversationMemory

from app.models.core import Conversation, Project
from app.models.output import Email

from app.extensions import db


logger = logging.getLogger(__name__)


def _current_user_uuid():
    try:
        return UUID(str(get_jwt_identity()))
    except (ValueError, TypeError):
        abort(401, message="Invalid authenticated user.")


def _owned_conversation_query(conversation_id):
    return (Conversation.query
            .join(Project, Conversation.project_id == Project.id)
            .filter(Conversation.id == conversation_id,
                    Project.owner_id == _current_user_uuid()))


# ============================================================
# BLUEPRINT
# ============================================================

blp = Blueprint(
    "chat",
    "chat",
    url_prefix="/api/v1/chat",
    description="Chat operations",
)


# ============================================================
# EMAIL RESPONSE PARSER
# ============================================================

def parse_email_response(response_text):
    """
    Convert the Email Agent's generated text into structured
    email fields.

    Expected formats include:

        Subject: ...
        To: ...
        Body:
        ...

    or:

        Subject: ...

        Dear HR Team,
        ...

    The parser is intentionally tolerant because the LLM
    response may vary slightly between generations.
    """

    text = str(
        response_text or ""
    ).strip()

    subject = ""
    recipient = "[Recipient]"
    body = text

    # --------------------------------------------------------
    # SUBJECT
    # --------------------------------------------------------

    subject_match = re.search(
        r"(?im)^\s*(?:subject|subject line)\s*:\s*(.+?)\s*$",
        text,
    )

    if subject_match:

        subject = (
            subject_match
            .group(1)
            .strip()
        )

    # --------------------------------------------------------
    # RECIPIENT / TO
    # --------------------------------------------------------

    recipient_match = re.search(
        r"(?im)^\s*(?:to|recipient|email)\s*:\s*(.+?)\s*$",
        text,
    )

    if recipient_match:

        recipient = (
            recipient_match
            .group(1)
            .strip()
        )

    # --------------------------------------------------------
    # BODY
    # --------------------------------------------------------

    body_match = re.search(
        r"(?is)\bbody\s*:\s*(.*)$",
        text,
    )

    if body_match:

        body = (
            body_match
            .group(1)
            .strip()
        )

    else:

        # ----------------------------------------------------
        # Remove Subject line from body
        # ----------------------------------------------------

        if subject_match:

            body = re.sub(
                r"(?im)^\s*(?:subject|subject line)\s*:\s*.+?\s*$",
                "",
                body,
                count=1,
            ).strip()

        # ----------------------------------------------------
        # Remove To line from body
        # ----------------------------------------------------

        if recipient_match:

            body = re.sub(
                r"(?im)^\s*(?:to|recipient|email)\s*:\s*.+?\s*$",
                "",
                body,
                count=1,
            ).strip()

        # ----------------------------------------------------
        # Remove standalone "Body:" if still present
        # ----------------------------------------------------

        body = re.sub(
            r"(?im)^\s*body\s*:\s*$",
            "",
            body,
            count=1,
        ).strip()

    # --------------------------------------------------------
    # Clean common markdown wrappers
    # --------------------------------------------------------

    body = re.sub(
        r"^```(?:text|email|markdown)?\s*",
        "",
        body,
        flags=re.IGNORECASE,
    )

    body = re.sub(
        r"\s*```$",
        "",
        body,
    )

    body = body.strip()

    # --------------------------------------------------------
    # Fallback subject
    # --------------------------------------------------------

    if not subject:

        # Try first meaningful line
        lines = [
            line.strip()
            for line in text.splitlines()
            if line.strip()
        ]

        if lines:

            first_line = lines[0]

            if not first_line.lower().startswith(
                (
                    "dear ",
                    "body:",
                )
            ):

                subject = first_line[:255]

    # --------------------------------------------------------
    # Final fallback
    # --------------------------------------------------------

    if not subject:

        subject = "AI Generated Email"

    if not body:

        body = text

    return {
        "subject": subject[:255],
        "recipient": recipient[:255],
        "body": body,
    }


# ============================================================
# EMAIL HTML CONVERTER
# ============================================================

def email_body_to_html(body):
    """
    Convert plain text email body into simple HTML.

    This is intentionally lightweight. It preserves paragraphs
    and line breaks without requiring another dependency.
    """

    safe_body = escape(
        str(body or "")
    )

    paragraphs = safe_body.split(
        "\n\n"
    )

    html_parts = []

    for paragraph in paragraphs:

        paragraph = paragraph.strip()

        if not paragraph:
            continue

        paragraph = paragraph.replace(
            "\n",
            "<br>",
        )

        html_parts.append(
            f"<p>{paragraph}</p>"
        )

    return "".join(
        html_parts
    )


# ============================================================
# CONVERSATIONS
# ============================================================

@blp.route("/conversations")
class Conversations(MethodView):

    # ========================================================
    # CREATE CONVERSATION
    # ========================================================

    @jwt_required()
    @blp.response(201)
    def post(self):

        """
        Create a real PostgreSQL conversation.
        """

        data = (
            request.get_json(
                silent=True
            )
            or {}
        )

        project_id = data.get(
            "project_id"
        )

        title = data.get(
            "title",
            "New Enterprise Workspace Chat"
        )

        agent_type = data.get(
            "agent_type",
            "chat"
        )

        # ----------------------------------------------------
        # Find project
        # ----------------------------------------------------

        if project_id:

            try:

                project_uuid = UUID(
                    str(project_id)
                )

            except (
                ValueError,
                TypeError,
            ):

                abort(
                    422,
                    message="Invalid project_id."
                )

            project = Project.query.filter_by(
                id=project_uuid,
                owner_id=_current_user_uuid(),
            ).first()

        else:

            # Never attach a conversation to another user's project.
            project = (Project.query
                       .filter_by(owner_id=_current_user_uuid())
                       .order_by(Project.created_at.asc())
                       .first())

        if not project:

            abort(
                404,
                message=(
                    "No project exists. "
                    "Create a project before "
                    "starting a conversation."
                )
            )

        # ----------------------------------------------------
        # Create REAL database conversation
        # ----------------------------------------------------

        conversation = Conversation(
            project_id=project.id,
            title=title,
        )

        db.session.add(
            conversation
        )

        db.session.commit()

        logger.info(
            "Conversation created: %s",
            conversation.id,
        )

        return {
            "id": str(
                conversation.id
            ),

            "project_id": str(
                conversation.project_id
            ),

            "title":
                conversation.title,

            "agent_type":
                agent_type,

            "created_at": (
                conversation.created_at.isoformat()
                if conversation.created_at
                else None
            ),

            "updated_at": (
                conversation.updated_at.isoformat()
                if conversation.updated_at
                else None
            ),

            "messages_count": 0,

        }, 201


    # ========================================================
    # GET CONVERSATIONS
    # ========================================================

    @jwt_required()
    @blp.response(200)
    def get(self):

        """
        Return conversations for a project.
        """

        project_id = request.args.get(
            "project_id"
        )

        query = (Conversation.query
                 .join(Project, Conversation.project_id == Project.id)
                 .filter(Project.owner_id == _current_user_uuid()))

        if project_id:

            try:

                project_uuid = UUID(
                    str(project_id)
                )

            except (
                ValueError,
                TypeError,
            ):

                abort(
                    422,
                    message="Invalid project_id."
                )

            query = query.filter_by(
                project_id=project_uuid
            )

        conversations = (
            query
            .order_by(
                Conversation.updated_at.desc()
            )
            .all()
        )

        return [

            {
                "id": str(
                    conversation.id
                ),

                "project_id": str(
                    conversation.project_id
                ),

                "title": (
                    conversation.title
                    or
                    "New Enterprise Workspace Chat"
                ),

                "created_at": (
                    conversation.created_at.isoformat()
                    if conversation.created_at
                    else None
                ),

                "updated_at": (
                    conversation.updated_at.isoformat()
                    if conversation.updated_at
                    else None
                ),

                "messages_count": len(
                    conversation.messages or []
                ),

                "last_message": (
                    conversation.messages[-1].content
                    if conversation.messages
                    else ""
                ),
            }

            for conversation
            in conversations
        ]


# ============================================================
# GET MESSAGES
# ============================================================

@blp.route(
    "/messages/<conversation_id>"
)
class ConversationMessages(MethodView):

    @jwt_required()
    @blp.response(200)
    def get(
        self,
        conversation_id
    ):

        # ----------------------------------------------------
        # Validate UUID
        # ----------------------------------------------------

        try:

            conversation_uuid = UUID(
                str(conversation_id)
            )

        except (
            ValueError,
            TypeError,
        ):

            abort(
                422,
                message="Invalid conversation_id."
            )

        # ----------------------------------------------------
        # Find conversation
        # ----------------------------------------------------

        conversation = _owned_conversation_query(conversation_uuid).first()

        if not conversation:

            abort(
                404,
                message="Conversation not found."
            )

        # ----------------------------------------------------
        # Return messages
        # ----------------------------------------------------

        return [

            {
                "id": str(
                    message.id
                ),

                "conversation_id": str(
                    message.conversation_id
                ),

                "role":
                    message.role,

                "content":
                    message.content,

                "agent_type":
                    message.agent_type,

                "created_at": (
                    message.created_at.isoformat()
                    if message.created_at
                    else None
                ),
            }

            for message
            in conversation.messages
        ]


# ============================================================
# DELETE CONVERSATION
# ============================================================

@blp.route(
    "/conversations/<conversation_id>"
)
class DeleteConversation(MethodView):

    @jwt_required()
    @blp.response(204)
    def delete(
        self,
        conversation_id
    ):

        try:

            conversation_uuid = UUID(
                str(conversation_id)
            )

        except (
            ValueError,
            TypeError,
        ):

            abort(
                422,
                message="Invalid conversation_id."
            )

        conversation = _owned_conversation_query(conversation_uuid).first()

        if not conversation:

            abort(
                404,
                message="Conversation not found."
            )

        try:

            db.session.delete(
                conversation
            )

            db.session.commit()

            logger.info(
                "Conversation deleted: %s",
                conversation_id,
            )

            return ""

        except Exception as e:

            db.session.rollback()

            logger.error(
                "Failed to delete conversation: %s",
                str(e),
                exc_info=True,
            )

            abort(
                500,
                message="Failed to delete conversation.",
            )


# ============================================================
# SEND CHAT MESSAGE
# ============================================================

@blp.route("/message")
class ChatMessage(MethodView):

    @blp.arguments(
        ChatRequestSchema
    )

    @blp.response(
        200,
        ChatResponseSchema
    )

    @blp.alt_response(
        500,
        schema=ErrorResponseSchema
    )

    @jwt_required()
    def post(
        self,
        chat_data
    ):

        # ====================================================
        # REQUEST DATA
        # ====================================================

        conversation_id = chat_data[
            "conversation_id"
        ]

        input_text = chat_data[
            "message"
        ]

        # ----------------------------------------------------
        # Selected frontend agent
        # ----------------------------------------------------

        agent_type = (
            chat_data.get(
                "agent_type"
            )
            or "chat"
        )

        agent_type = str(
            agent_type
        ).strip().lower()

        # ----------------------------------------------------
        # RAG collection
        # ----------------------------------------------------

        rag_collection = chat_data.get(
            "rag_collection"
        )

        # ====================================================
        # VALIDATE CONVERSATION UUID
        # ====================================================

        try:

            conversation_uuid = UUID(
                str(conversation_id)
            )

        except (
            ValueError,
            TypeError,
        ):

            abort(
                422,
                message="Invalid conversation_id."
            )

        # ====================================================
        # FIND REAL POSTGRESQL CONVERSATION
        # ====================================================

        conversation = _owned_conversation_query(conversation_uuid).first()

        if not conversation:

            abort(
                404,
                message="Conversation not found."
            )

        # ====================================================
        # SAVE USER MESSAGE
        # ====================================================

        ConversationMemory.save_message(
            str(
                conversation.id
            ),
            "user",
            input_text,
        )

        try:

            # =================================================
            # RUN MULTI-AGENT ORCHESTRATOR
            # =================================================

            result = (
                workflow_orchestrator
                .process_request(

                    input_text,

                    str(
                        conversation.id
                    ),

                    # Selected frontend agent
                    agent_type=agent_type,

                    # Selected RAG collection
                    rag_collection=rag_collection,

                    # Real PostgreSQL project
                    project_id=str(
                        conversation.project_id
                    ),
                )
            )

            # =================================================
            # NORMALIZE RESULT
            # =================================================

            if not isinstance(
                result,
                dict
            ):

                result = {
                    "response":
                        str(result),

                    "agent_used":
                        agent_type,

                    "sources":
                        [],
                }

            # =================================================
            # RESPONSE
            # =================================================

            response_text = str(
                result.get(
                    "response",
                    "No response generated."
                )
                or "No response generated."
            ).strip()

            # =================================================
            # ACTUAL AGENT USED
            # =================================================

            agent_used = str(
                result.get(
                    "agent_used",
                    agent_type
                )
                or agent_type
            ).strip().lower()

            # =================================================
            # KNOWLEDGE SOURCES
            # =================================================

            sources = result.get(
                "sources",
                []
            )

            if not isinstance(
                sources,
                list
            ):

                sources = []

            # =================================================
            # SAVE ASSISTANT MESSAGE
            # =================================================

            ConversationMemory.save_message(
                str(
                    conversation.id
                ),
                "assistant",
                response_text,
                agent_type=agent_used,
            )

            # =================================================
            # EMAIL AGENT
            # =================================================

            email_id = None
            email_data = None

            if agent_used == "email":

                logger.info(
                    "Email Agent completed. "
                    "Preparing email database record."
                )

                # ------------------------------------------------
                # First use structured values if the Email Agent
                # already provides them.
                # ------------------------------------------------

                structured_subject = result.get(
                    "subject"
                )

                structured_recipient = result.get(
                    "recipient"
                )

                structured_body = result.get(
                    "body"
                )

                # ------------------------------------------------
                # Parse LLM response when structured values
                # aren't available.
                # ------------------------------------------------

                parsed_email = parse_email_response(
                    response_text
                )

                # ------------------------------------------------
                # SUBJECT
                # ------------------------------------------------

                email_subject = str(
                    structured_subject
                    or parsed_email.get(
                        "subject",
                        ""
                    )
                    or "AI Generated Email"
                ).strip()

                # ------------------------------------------------
                # RECIPIENT
                # ------------------------------------------------

                email_recipient = str(
                    structured_recipient
                    or parsed_email.get(
                        "recipient",
                        "[Recipient]"
                    )
                    or "[Recipient]"
                ).strip()

                # ------------------------------------------------
                # BODY
                # ------------------------------------------------

                email_body = str(
                    structured_body
                    or parsed_email.get(
                        "body",
                        ""
                    )
                    or response_text
                ).strip()

                # ------------------------------------------------
                # STATUS
                # ------------------------------------------------

                email_status = str(
                    result.get(
                        "status",
                        "draft"
                    )
                    or "draft"
                ).strip().lower()

                if email_status not in {
                    "draft",
                    "sent",
                    "failed",
                }:

                    email_status = "draft"

                # ------------------------------------------------
                # Generate HTML body
                # ------------------------------------------------

                email_html = email_body_to_html(
                    email_body
                )

                # ------------------------------------------------
                # Create Email database record
                # ------------------------------------------------

                email = Email(

                    # JWT is currently disabled for local
                    # development, therefore sender_id is None.
                    sender_id=None,

                    recipient=email_recipient[:255],

                    subject=email_subject[:255],

                    body_text=email_body,

                    body_html=email_html,

                    status=email_status,
                )

                db.session.add(
                    email
                )

                # ------------------------------------------------
                # Generate UUID before commit
                # ------------------------------------------------

                db.session.flush()

                email_id = str(
                    email.id
                )

                email_data = {

                    "id":
                        email_id,

                    "recipient":
                        email.recipient,

                    "subject":
                        email.subject,

                    "body_text":
                        email.body_text,

                    "body_html":
                        email.body_html,

                    "status":
                        email.status,

                    "created_at":
                        (
                            email.created_at.isoformat()
                            if email.created_at
                            else None
                        ),
                }

                logger.info(
                    "Email saved successfully | "
                    "id=%s | subject=%s | recipient=%s",
                    email_id,
                    email.subject,
                    email.recipient,
                )

            # =================================================
            # REPORT ID
            # =================================================

            report_id = result.get(
                "report_id"
            )

            # =================================================
            # UPDATE CONVERSATION TIMESTAMP
            # =================================================

            conversation.updated_at = (
                db.func.now()
            )

            # =================================================
            # COMMIT EVERYTHING
            # =================================================

            db.session.commit()

            # =================================================
            # COMPLETE RESPONSE
            # =================================================

            response = {

                "response":
                    response_text,

                "agent_used":
                    agent_used,

                "sources":
                    sources,
            }

            # =================================================
            # REPORT SUPPORT
            # =================================================

            if report_id:

                response[
                    "report_id"
                ] = str(
                    report_id
                )

            # =================================================
            # EMAIL SUPPORT
            # =================================================

            if email_id:

                response[
                    "email_id"
                ] = email_id

                response[
                    "email"
                ] = email_data

            # =================================================
            # LOG SUCCESS
            # =================================================

            logger.info(
                "Chat request completed successfully | "
                "conversation=%s | agent=%s",
                conversation.id,
                agent_used,
            )

            return response

        except Exception as e:

            # =================================================
            # ROLLBACK DATABASE
            # =================================================

            db.session.rollback()

            # =================================================
            # LOG ERROR
            # =================================================

            logger.error(
                "Chat processing failed: %s",
                str(e),
                exc_info=True,
            )

            # =================================================
            # RETURN ERROR
            # =================================================

            abort(
                500,
                message=(
                    "Internal server error "
                    f"processing chat: {str(e)}"
                ),
            )