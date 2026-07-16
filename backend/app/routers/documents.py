from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas
from ..services.markdown_parser import parse_markdown, ParsedNode
from ..parser.pdf import parse_pdf, tree_to_markdown

router = APIRouter(
    tags=["documents"]
)

import os
import tempfile
import shutil
import re
from fastapi.responses import FileResponse

@router.post("/documents/upload", response_model=schemas.Document)
async def upload_document(
    title: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    content = await file.read()
    filename = file.filename.lower()
    
    metadata = {}
    
    # Save file
    os.makedirs("uploads", exist_ok=True)
    file_path = os.path.join("uploads", f"{title}_{filename}")
    with open(file_path, "wb") as f:
        f.write(content)
    
    if filename.endswith('.pdf'):
        source_type = "pdf"
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        try:
            root_nodes, metadata = parse_pdf(tmp_path)
            text = tree_to_markdown(root_nodes)
        finally:
            os.remove(tmp_path)
            
    elif filename.endswith('.docx'):
        source_type = "docx"
        import mammoth
        with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        try:
            with open(tmp_path, "rb") as docx_file:
                result = mammoth.convert_to_markdown(docx_file)
                text = result.value
            root_nodes = parse_markdown(text)
        finally:
            os.remove(tmp_path)
            
    else:
        # Default to markdown
        source_type = "markdown"
        text = content.decode('utf-8')
        root_nodes = parse_markdown(text)

    # Normalize filename to determine parent document
    # Strip extension and common version suffixes (e.g. _v1, -v2, _v3.0)
    base_name = os.path.splitext(filename)[0]
    normalized_name = re.sub(r'[-_]v(ersion)?[\s_]*\d+(\.\d+)?$', '', base_name, flags=re.IGNORECASE).strip()
    
    # Try to find existing document by exact title OR normalized filename
    # We fetch all documents and check in python to use the same normalization logic
    existing_docs = db.query(models.Document).all()
    
    db_doc = None
    print(f"DEBUG: normalizing {base_name} -> {normalized_name}, title: {title}")
    for doc in existing_docs:
        if doc.title.lower() == title.lower():
            print(f"DEBUG: matched on title {doc.title}")
            db_doc = doc
            break
        if doc.original_filename:
            doc_base = os.path.splitext(doc.original_filename.lower())[0]
            doc_norm = re.sub(r'[-_]v(ersion)?[\s_]*\d+(\.\d+)?$', '', doc_base, flags=re.IGNORECASE).strip()
            if doc_norm == normalized_name:
                print(f"DEBUG: matched on normalized filename {doc_norm}")
                db_doc = doc
                break

    if not db_doc:
        # Create document
        db_doc = models.Document(title=title, source_type=source_type, original_filename=filename)
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)
        version_num = 1
    else:
        # Get highest version
        latest_version = db.query(models.Version).filter(models.Version.document_id == db_doc.id).order_by(models.Version.version_num.desc()).first()
        version_num = (latest_version.version_num + 1) if latest_version else 1
        
        # If we append a version, we should probably keep the most recent title if we want, but we will leave the parent document title as is.

    # Create new version
    db_version = models.Version(
        document_id=db_doc.id,
        version_num=version_num,
        raw_markdown=text,
        page_count=metadata.get('page_count'),
        processing_time=metadata.get('processing_time'),
        ocr_used=metadata.get('ocr_used', False),
        parser_version=metadata.get('parser_version')
    )
    db.add(db_version)
    db.commit()
    db.refresh(db_version)

    # Save a version-specific copy of the file for the PDF viewer
    ext = os.path.splitext(filename)[1]
    version_file_path = os.path.join("uploads", f"version_{db_version.id}{ext}")
    shutil.copy(file_path, version_file_path)

    def insert_node(parsed_node: ParsedNode, parent_id: int = None):
        db_node = models.Node(
            version_id=db_version.id,
            node_id=parsed_node.node_id,
            level=parsed_node.level,
            title=parsed_node.title,
            body=parsed_node.body,
            content_hash=parsed_node.content_hash,
            parent_id=parent_id,
            page_number=getattr(parsed_node, 'page_number', None),
            node_type=getattr(parsed_node, 'node_type', 'paragraph')
        )
        db.add(db_node)
        db.commit()
        db.refresh(db_node)
        
        for child in parsed_node.children:
            insert_node(child, db_node.id)

    for root in root_nodes:
        insert_node(root)

    return db_doc

@router.get("/documents", response_model=List[schemas.Document])
def get_documents(db: Session = Depends(get_db)):
    return db.query(models.Document).all()

@router.get("/documents/{doc_id}", response_model=schemas.Document)
def get_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.get("/documents/{doc_id}/versions", response_model=List[schemas.Version])
def get_document_versions(doc_id: int, db: Session = Depends(get_db)):
    versions = db.query(models.Version).filter(models.Version.document_id == doc_id).order_by(models.Version.version_num.asc()).all()
    if not versions:
        raise HTTPException(status_code=404, detail="No versions found for this document")
    return versions

@router.get("/versions/{version_id}/nodes", response_model=List[schemas.Node])
def get_version_nodes(version_id: int, db: Session = Depends(get_db)):
    nodes = db.query(models.Node).filter(models.Node.version_id == version_id).all()
    return nodes

@router.get("/versions", response_model=List[schemas.Version])
def get_versions(doc_id: int = None, db: Session = Depends(get_db)):
    query = db.query(models.Version)
    if doc_id:
        query = query.filter(models.Version.document_id == doc_id)
    return query.all()

@router.get("/nodes", response_model=List[schemas.Node])
def get_all_nodes(db: Session = Depends(get_db)):
    return db.query(models.Node).limit(1000).all()

@router.get("/nodes/{node_id}", response_model=schemas.Node)
def get_node(node_id: int, db: Session = Depends(get_db)):
    node = db.query(models.Node).filter(models.Node.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node

@router.get("/search", response_model=List[schemas.Node])
def search_nodes(q: str, db: Session = Depends(get_db)):
    # Simple search in title and body
    nodes = db.query(models.Node).filter(
        (models.Node.title.ilike(f"%{q}%")) | (models.Node.body.ilike(f"%{q}%"))
    ).limit(50).all()
    return nodes

@router.get("/documents/{doc_id}/file")
def get_document_file(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = os.path.join("uploads", f"{doc.title}_{doc.original_filename}")
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found on server")

@router.get("/versions/{version_id}/file")
def get_version_file(version_id: int, db: Session = Depends(get_db)):
    version = db.query(models.Version).filter(models.Version.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
        
    doc = db.query(models.Document).filter(models.Document.id == version.document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    ext = os.path.splitext(doc.original_filename)[1] if doc.original_filename else ".pdf"
    file_path = os.path.join("uploads", f"version_{version_id}{ext}")
    
    if os.path.exists(file_path):
        return FileResponse(file_path)
        
    # Fallback for old uploads
    fallback_path = os.path.join("uploads", f"{doc.title}_{doc.original_filename}")
    if os.path.exists(fallback_path):
        return FileResponse(fallback_path)
        
    raise HTTPException(status_code=404, detail="File not found on server")

@router.delete("/documents/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    versions = db.query(models.Version).filter(models.Version.document_id == doc_id).all()
    version_ids = [v.id for v in versions]
    
    if version_ids:
        nodes = db.query(models.Node).filter(models.Node.version_id.in_(version_ids)).all()
        node_ids = [n.id for n in nodes]
        
        if node_ids:
            db.query(models.SelectionNode).filter(models.SelectionNode.node_id.in_(node_ids)).delete(synchronize_session=False)
            
        db.query(models.Generation).filter(models.Generation.version_id.in_(version_ids)).delete(synchronize_session=False)
        
    db.delete(doc)
    db.commit()
    return {"status": "success", "detail": "Document deleted"}
