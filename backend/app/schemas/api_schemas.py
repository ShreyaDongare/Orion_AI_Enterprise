from marshmallow import Schema, fields, validate

class UserRegistrationSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8))
    first_name = fields.String()
    last_name = fields.String()

class UserLoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True)

class TokenSchema(Schema):
    access_token = fields.String()
    refresh_token = fields.String()

class ChatRequestSchema(Schema):
    conversation_id = fields.String(required=True)
    message = fields.String(required=True)

class ChatResponseSchema(Schema):
    response = fields.String()
    agent_used = fields.String()

class ErrorResponseSchema(Schema):
    error = fields.String()
