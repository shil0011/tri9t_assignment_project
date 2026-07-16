from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    source_type = Column(String, default="markdown")
    original_filename = Column(String, nullable=True)

    versions = relationship("Version", back_populates="document", cascade="all, delete-orphan")


class Version(Base):
    __tablename__ = "versions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    version_num = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    raw_markdown = Column(Text)
    page_count = Column(Integer, nullable=True)
    processing_time = Column(Integer, nullable=True)
    ocr_used = Column(Boolean, default=False)
    parser_version = Column(String, nullable=True)

    document = relationship("Document", back_populates="versions")
    nodes = relationship("Node", back_populates="version", cascade="all, delete-orphan")
    generations = relationship("Generation", back_populates="version")


class Node(Base):
    __tablename__ = "nodes"

    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey("versions.id"))
    node_id = Column(String, index=True)  # custom ID like 'doc1-v1-n1' or index
    level = Column(Integer)  # 1 for #, 2 for ##, etc.
    title = Column(String)
    body = Column(Text)
    content_hash = Column(String, index=True)
    parent_id = Column(Integer, ForeignKey("nodes.id"), nullable=True)
    page_number = Column(Integer, nullable=True)
    node_type = Column(String, default="paragraph")

    version = relationship("Version", back_populates="nodes")
    parent = relationship("Node", remote_side=[id], backref="children")
    selections = relationship("SelectionNode", back_populates="node", cascade="all, delete-orphan")


class Selection(Base):
    __tablename__ = "selections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    nodes = relationship("SelectionNode", back_populates="selection", cascade="all, delete-orphan")
    generations = relationship("Generation", back_populates="selection", cascade="all, delete-orphan")


class SelectionNode(Base):
    __tablename__ = "selection_nodes"

    selection_id = Column(Integer, ForeignKey("selections.id"), primary_key=True)
    node_id = Column(Integer, ForeignKey("nodes.id"), primary_key=True)

    selection = relationship("Selection", back_populates="nodes")
    node = relationship("Node", back_populates="selections")


class Generation(Base):
    __tablename__ = "generations"

    id = Column(Integer, primary_key=True, index=True)
    selection_id = Column(Integer, ForeignKey("selections.id"))
    version_id = Column(Integer, ForeignKey("versions.id"))
    model = Column(String)
    prompt = Column(Text)
    output = Column(Text)  # JSON stored as string
    created_at = Column(DateTime, default=datetime.utcnow)
    is_stale = Column(Boolean, default=False)
    stale_reason = Column(Text, nullable=True)

    selection = relationship("Selection", back_populates="generations")
    version = relationship("Version", back_populates="generations")
