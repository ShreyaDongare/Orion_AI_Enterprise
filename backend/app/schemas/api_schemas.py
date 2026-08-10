from marshmallow import Schema, fields, validate


# ============================================================
# USER REGISTRATION
# ============================================================

class UserRegistrationSchema(Schema):

    email = fields.Email(
        required=True
    )

    password = fields.String(
        required=True,
        validate=validate.Length(
            min=8
        )
    )

    first_name = fields.String()

    last_name = fields.String()


# ============================================================
# USER LOGIN
# ============================================================

class UserLoginSchema(Schema):

    email = fields.Email(
        required=True
    )

    password = fields.String(
        required=True
    )


# ============================================================
# TOKEN
# ============================================================

class TokenSchema(Schema):

    access_token = fields.String()

    refresh_token = fields.String()


# ============================================================
# CHAT REQUEST
# ============================================================

class ChatRequestSchema(Schema):

    conversation_id = fields.String(
        required=True
    )

    message = fields.String(
        required=True
    )

    # --------------------------------------------------------
    # SELECTED AGENT FROM FRONTEND
    # --------------------------------------------------------

    agent_type = fields.String(
        required=False,
        allow_none=True
    )

    # --------------------------------------------------------
    # RAG COLLECTION
    # --------------------------------------------------------

    rag_collection = fields.String(
        required=False,
        allow_none=True
    )


# ============================================================
# CHAT SOURCE
# ============================================================

class ChatSourceSchema(Schema):

    document = fields.String(
        allow_none=True
    )

    document_id = fields.String(
        allow_none=True
    )

    distance = fields.Float(
        allow_none=True
    )

    chunks_retrieved = fields.Integer(
        allow_none=True
    )

    source = fields.String(
        allow_none=True
    )

    file_path = fields.String(
        allow_none=True
    )


# ============================================================
# CHAT RESPONSE
# ============================================================

class ChatResponseSchema(Schema):

    response = fields.String()

    agent_used = fields.String()

    sources = fields.List(
        fields.Nested(
            ChatSourceSchema
        ),
        load_default=[]
    )


# ============================================================
# ERROR RESPONSE
# ============================================================

class ErrorResponseSchema(Schema):

    error = fields.String()

    message = fields.String(
        allow_none=True
    )