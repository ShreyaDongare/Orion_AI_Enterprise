from datetime import datetime
import uuid
from sqlalchemy.dialects.postgresql import UUID
from app.extensions import db

class KnowledgeCollection(db.Model):
    __tablename__ = 'knowledge_collections'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    owner_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    documents = db.relationship('Document', back_populates='collection', cascade="all, delete-orphan")

class Document(db.Model):
    __tablename__ = 'documents'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    collection_id = db.Column(UUID(as_uuid=True), db.ForeignKey('knowledge_collections.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(50))
    tags = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    collection = db.relationship('KnowledgeCollection', back_populates='documents')
    versions = db.relationship('DocumentVersion', back_populates='document', cascade="all, delete-orphan", order_by='DocumentVersion.version_number.desc()')

class DocumentVersion(db.Model):
    __tablename__ = 'document_versions'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = db.Column(UUID(as_uuid=True), db.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False)
    version_number = db.Column(db.Integer, nullable=False)
    storage_path = db.Column(db.String(512), nullable=False)
    checksum = db.Column(db.String(256))
    chroma_collection_id = db.Column(db.String(255)) # Reference to ChromaDB
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    document = db.relationship('Document', back_populates='versions')
