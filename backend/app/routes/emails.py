from uuid import UUID
import logging
import re

from flask import request
from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.output import Email


logger = logging.getLogger(__name__)


def _current_user_uuid():
    try:
        return UUID(str(get_jwt_identity()))
    except (ValueError, TypeError):
        abort(401, message="Invalid authenticated user.")


# ============================================================
# EMAIL BLUEPRINT
# ============================================================

blp = Blueprint(
    "emails",
    "emails",
    url_prefix="/api/v1/emails",
    description="Email management operations",
)


# ============================================================
# HELPERS
# ============================================================

def extract_email_address(text):
    """
    Extract the first email address from text.
    """

    if not text:
        return None

    match = re.search(
        r"[\w.+-]+@[\w-]+\.[\w.-]+",
        str(text),
    )

    if match:
        return match.group(0)

    return None


def clean_subject(subject):
    """
    Normalize an email subject.
    """

    if not subject:
        return ""

    subject = str(subject).strip()

    # Remove repeated Subject: prefix
    subject = re.sub(
        r"^subject\s*:\s*",
        "",
        subject,
        flags=re.IGNORECASE,
    )

    return subject.strip()


def extract_subject_from_response(response):
    """
    Extract Subject from a raw Email Agent response.
    """

    if not response:
        return ""

    response = str(response).strip()

    # --------------------------------------------------------
    # Subject: ...
    # --------------------------------------------------------

    match = re.search(
        r"(?im)^subject\s*:\s*(.+)$",
        response,
    )

    if match:
        return clean_subject(
            match.group(1)
        )

    # --------------------------------------------------------
    # Subject on one line followed by content
    # --------------------------------------------------------

    match = re.search(
        r"(?im)^subject\s*$\s*(.+)$",
        response,
    )

    if match:
        return clean_subject(
            match.group(1)
        )

    # --------------------------------------------------------
    # Fallback to first meaningful line
    # --------------------------------------------------------

    lines = [
        line.strip()
        for line in response.splitlines()
        if line.strip()
    ]

    if lines:

        first_line = lines[0]

        if (
            len(first_line) <= 150
            and not first_line.lower().startswith(
                ("dear ", "hi ", "hello ")
            )
        ):
            return clean_subject(
                first_line
            )

    return ""


def clean_body(response, subject=""):
    """
    Remove email metadata from a raw AI response
    and return only the email body.
    """

    if not response:
        return ""

    body = str(response).strip()

    # --------------------------------------------------------
    # Remove markdown code fences
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
    # Remove Subject: line
    # --------------------------------------------------------

    body = re.sub(
        r"(?im)^subject\s*:\s*.+\n?",
        "",
        body,
        count=1,
    )

    # --------------------------------------------------------
    # Remove standalone Subject line
    # --------------------------------------------------------

    if subject:

        body = re.sub(
            rf"^{re.escape(subject)}\s*\n+",
            "",
            body,
            count=1,
            flags=re.IGNORECASE,
        )

    return body.strip()


def normalize_email_payload(data):
    """
    Convert either structured email data or a raw AI response
    into a consistent email payload.
    """

    data = data or {}

    # ========================================================
    # RAW AI RESPONSE
    # ========================================================

    raw_response = data.get(
        "response",
        ""
    )

    # ========================================================
    # SUBJECT
    # ========================================================

    subject = clean_subject(
        data.get(
            "subject",
            ""
        )
    )

    if not subject and raw_response:

        subject = extract_subject_from_response(
            raw_response
        )

    # ========================================================
    # BODY
    # ========================================================

    body_text = str(
        data.get(
            "body_text",
            ""
        )
        or ""
    ).strip()

    if not body_text and data.get("body"):

        body_text = str(
            data.get("body")
        ).strip()

    if not body_text and raw_response:

        body_text = clean_body(
            raw_response,
            subject,
        )

    # ========================================================
    # RECIPIENT
    # ========================================================

    recipient = str(
        data.get(
            "recipient",
            ""
        )
        or ""
    ).strip()

    if not recipient and raw_response:

        extracted_recipient = (
            extract_email_address(
                raw_response
            )
        )

        if extracted_recipient:

            recipient = extracted_recipient

    # Do not invent recipient information.
    if not recipient:

        recipient = "[Recipient]"

    # ========================================================
    # HTML
    # ========================================================

    body_html = str(
        data.get(
            "body_html",
            ""
        )
        or ""
    )

    # ========================================================
    # STATUS
    # ========================================================

    status = str(
        data.get(
            "status",
            "draft"
        )
        or "draft"
    ).lower()

    if status not in {
        "draft",
        "sent",
        "failed",
    }:

        status = "draft"

    # ========================================================
    # SENDER
    # ========================================================

    sender_id = data.get(
        "sender_id"
    )

    return {
        "recipient": recipient,
        "subject": subject,
        "body_text": body_text,
        "body_html": body_html,
        "status": status,
        "sender_id": sender_id,
    }


# ============================================================
# SERIALIZE EMAIL
# ============================================================

def serialize_email(email):

    return {
        "id": str(email.id),

        "sender_id": (
            str(email.sender_id)
            if email.sender_id
            else None
        ),

        "recipient": email.recipient,

        "subject": email.subject or "",

        "body_text": email.body_text or "",

        "body_html": email.body_html or "",

        "status": email.status or "draft",

        "sent_at": (
            email.sent_at.isoformat()
            if email.sent_at
            else None
        ),

        "created_at": (
            email.created_at.isoformat()
            if email.created_at
            else None
        ),
    }


# ============================================================
# EMAIL COLLECTION
# ============================================================

@blp.route("")
class EmailCollection(MethodView):

    # ========================================================
    # GET EMAILS
    # ========================================================

    @jwt_required()
    @blp.response(200)
    def get(self):

        try:

            emails = (
                Email.query
                .filter(Email.sender_id == _current_user_uuid())
                .order_by(Email.created_at.desc())
                .all()
            )

            return [
                serialize_email(email)
                for email in emails
            ]

        except Exception as e:

            logger.error(
                "Failed to load emails: %s",
                str(e),
                exc_info=True,
            )

            abort(
                500,
                message="Failed to load emails.",
            )

    # ========================================================
    # CREATE EMAIL
    # ========================================================

    @jwt_required()
    @blp.response(201)
    def post(self):

        data = (
            request.get_json(
                silent=True
            )
            or {}
        )

        try:

            payload = normalize_email_payload(
                data
            )

            recipient = payload["recipient"]

            # ====================================================
            # VALIDATE RECIPIENT
            # ====================================================

            if not recipient:

                abort(
                    400,
                    message="Recipient is required.",
                )

            # Sender is always the authenticated user; never trust the request body.
            sender_uuid = _current_user_uuid()

            # ====================================================
            # CREATE EMAIL
            # ====================================================

            email = Email(
                sender_id=sender_uuid,

                recipient=recipient,

                subject=payload["subject"],

                body_text=payload["body_text"],

                body_html=payload["body_html"],

                status=payload["status"],
            )

            db.session.add(
                email
            )

            db.session.commit()

            logger.info(
                "Email created successfully: %s",
                email.id,
            )

            return (
                serialize_email(
                    email
                ),
                201,
            )

        except Exception as e:

            db.session.rollback()

            logger.error(
                "Failed to create email: %s",
                str(e),
                exc_info=True,
            )

            abort(
                500,
                message="Failed to create email.",
            )


# ============================================================
# SINGLE EMAIL
# ============================================================

@blp.route(
    "/<email_id>"
)
class EmailResource(MethodView):

    # ========================================================
    # GET EMAIL
    # ========================================================

    @jwt_required()
    @blp.response(200)
    def get(
        self,
        email_id,
    ):

        try:

            email_uuid = UUID(
                str(email_id)
            )

        except (
            ValueError,
            TypeError,
        ):

            abort(
                422,
                message="Invalid email_id.",
            )

        email = (Email.query
                 .filter(Email.id == email_uuid,
                         Email.sender_id == _current_user_uuid())
                 .first())

        if not email:

            abort(
                404,
                message="Email not found.",
            )

        return serialize_email(
            email
        )

    # ========================================================
    # DELETE EMAIL
    # ========================================================

    @jwt_required()
    def delete(
        self,
        email_id,
    ):

        try:

            email_uuid = UUID(
                str(email_id)
            )

        except (
            ValueError,
            TypeError,
        ):

            abort(
                422,
                message="Invalid email_id.",
            )

        email = (Email.query
                 .filter(Email.id == email_uuid,
                         Email.sender_id == _current_user_uuid())
                 .first())

        if not email:

            abort(
                404,
                message="Email not found.",
            )

        try:

            db.session.delete(
                email
            )

            db.session.commit()

            logger.info(
                "Email deleted successfully: %s",
                email_id,
            )

            return "", 204

        except Exception as e:

            db.session.rollback()

            logger.error(
                "Failed to delete email: %s",
                str(e),
                exc_info=True,
            )

            abort(
                500,
                message="Failed to delete email.",
            )