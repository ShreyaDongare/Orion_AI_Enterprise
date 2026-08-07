from datetime import datetime
import uuid
from sqlalchemy.dialects.postgresql import UUID
from app.extensions import db

class AgentExecution(db.Model):
    __tablename__ = 'agent_executions'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_type = db.Column(db.String(100), nullable=False)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    conversation_id = db.Column(UUID(as_uuid=True), db.ForeignKey('conversations.id', ondelete='SET NULL'), nullable=True)
    status = db.Column(db.String(50), nullable=False) # 'pending', 'running', 'completed', 'failed'
    input_data = db.Column(db.JSON)
    output_data = db.Column(db.JSON)
    error_message = db.Column(db.Text)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

class LLMKeyUsage(db.Model):
    __tablename__ = 'llm_key_usage'
    id = db.Column(db.Integer, primary_key=True)
    key_identifier = db.Column(db.String(255), unique=True, nullable=False) # e.g., 'GEMINI_API_KEY_1'
    total_requests = db.Column(db.Integer, default=0)
    failed_requests = db.Column(db.Integer, default=0)
    total_prompt_tokens = db.Column(db.Integer, default=0)
    total_completion_tokens = db.Column(db.Integer, default=0)
    last_used = db.Column(db.DateTime)
    last_error = db.Column(db.Text)
    is_exhausted = db.Column(db.Boolean, default=False)
    exhausted_until = db.Column(db.DateTime)

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Analytics(db.Model):
    __tablename__ = 'analytics'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type = db.Column(db.String(100), nullable=False)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    event_data = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
