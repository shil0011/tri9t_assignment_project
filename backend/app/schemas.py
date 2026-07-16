from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

class NodeBase(BaseModel):
    title: str
    body: str
    level: int
    node_id: str

class NodeCreate(NodeBase):
    pass

class Node(NodeBase):
    id: int
    version_id: int
    content_hash: str
    parent_id: Optional[int]
    page_number: Optional[int] = None
    node_type: str = "paragraph"

    class Config:
        from_attributes = True

class VersionBase(BaseModel):
    version_num: int
    raw_markdown: str

class VersionCreate(VersionBase):
    pass

class Version(VersionBase):
    id: int
    document_id: int
    created_at: datetime
    page_count: Optional[int] = None
    processing_time: Optional[int] = None
    ocr_used: bool = False
    parser_version: Optional[str] = None
    # nodes: List[Node] = []

    class Config:
        from_attributes = True

class DocumentBase(BaseModel):
    title: str

class DocumentCreate(DocumentBase):
    pass

class Document(DocumentBase):
    id: int
    created_at: datetime
    source_type: str = "markdown"
    original_filename: Optional[str] = None
    versions: List[Version] = []

    class Config:
        from_attributes = True

class SelectionBase(BaseModel):
    name: str
    node_ids: List[int]

class SelectionCreate(SelectionBase):
    pass

class Selection(BaseModel):
    id: int
    name: str
    created_at: datetime
    nodes: List[Node] = []

    class Config:
        from_attributes = True

class GenerationBase(BaseModel):
    model: str
    prompt: str
    output: Any # JSON

class GenerationCreate(BaseModel):
    selection_id: int
    version_id: int
    model: str

class Generation(GenerationBase):
    id: int
    selection_id: int
    version_id: int
    created_at: datetime
    is_stale: bool
    stale_reason: Optional[str]

    class Config:
        from_attributes = True

class QAItem(BaseModel):
    question: str
    answer: str
    traceability_node_id: str

class QAOutput(BaseModel):
    test_cases: List[QAItem]

class DiffSummary(BaseModel):
    added: int
    deleted: int
    modified: int

class NodeDiff(BaseModel):
    node_id: str
    title: str
    old_title: Optional[str] = None
    status: str # "added", "deleted", "modified", "unchanged"
    old_hash: Optional[str] = None
    new_hash: Optional[str] = None
    old_content: Optional[str] = None
    new_content: Optional[str] = None

class CompareResult(BaseModel):
    old_version_id: int
    new_version_id: int
    summary: DiffSummary
    diffs: List[NodeDiff]

class TraceabilityGraph(BaseModel):
    generation_id: int
    selection_id: int
    version_id: int
    document_title: str
    document_pages: Optional[int] = None
    document_created: datetime
    document_parser: Optional[str] = None
    document_ocr: bool = False
    nodes: List[Node]
    prompt: str
    model: str
    output: Any
    is_stale: bool
    stale_reason: Optional[str] = None
    generated_at: datetime
    
    # New detailed fields for enterprise traceability UI
    parsed_at: datetime
    selection_created_at: datetime
    llm_latency_ms: int = 12500
    llm_input_tokens: int = 4050
    llm_output_tokens: int = 1200
    validation_duration_ms: int = 120

