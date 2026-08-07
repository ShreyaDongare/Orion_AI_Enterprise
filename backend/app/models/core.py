from datetime import datetime
import uuid
from sqlalchemy.dialects.postgresql import UUID
from app.extensions import db

class Project(db.Model):
    __tablename__ = 'projects'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    owner_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    owner = db.relationship('User', back_populates='projects')
    conversations = db.relationship('Conversation', back_populates='project', cascade="all, delete-orphan")

class Conversation(db.Model):
    __tablename__ = 'conversations'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = db.Column(UUID(as_uuid=True), db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    project = db.relationship('Project', back_populates='conversations')
    messages = db.relationship('Message', back_populates='conversation', cascade="all, delete-orphan", order_by='Message.created_at')

class Message(db.Model):
    __tablename__ = 'messages'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = db.Column(UUID(as_uuid=True), db.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False)
    role = db.Column(db.String(50), nullable=False) # 'user', 'assistant', 'system'
    content = db.Column(db.Text, nullable=False)
    agent_type = db.Column(db.String(100), nullable=True) # Which agent handled this, if role is assistant
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    conversation = db.relationship('Conversation', back_populates='messages')
    input_artifacts = db.relationship('InputArtifact', back_populates='message', cascade="all, delete-orphan")

class InputArtifact(db.Model):
    __tablename__ = 'input_artifacts'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = db.Column(UUID(as_uuid=True), db.ForeignKey('messages.id', ondelete='CASCADE'), nullable=False)
    artifact_type = db.Column(db.String(50), nullable=False) # 'text', 'pdf', 'docx', 'xlsx', 'csv', 'image', 'url'
    raw_storage_ref = db.Column(db.String(512)) # Path in local storage or S3
    extracted_text = db.Column(db.Text)
    metadata_json = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    message = db.relationship('Message', back_populates='input_artifacts')
