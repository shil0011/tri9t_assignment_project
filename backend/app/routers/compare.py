from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas
import re

def normalize_text(text):
    if not text: return ""
    return re.sub(r'\s+', ' ', text).strip()

router = APIRouter(
    tags=["compare"]
)

@router.get("/versions/compare", response_model=schemas.CompareResult)
def compare_versions(old_version_id: int, new_version_id: int, db: Session = Depends(get_db)):
    old_nodes = db.query(models.Node).filter(models.Node.version_id == old_version_id).all()
    new_nodes = db.query(models.Node).filter(models.Node.version_id == new_version_id).all()
    
    old_dict = {n.node_id: n for n in old_nodes}
    new_dict = {n.node_id: n for n in new_nodes}
    
    diffs = []
    added = 0
    deleted = 0
    modified = 0
    
    all_node_ids = set(old_dict.keys()).union(set(new_dict.keys()))
    
    for nid in all_node_ids:
        if nid in old_dict and nid not in new_dict:
            deleted += 1
            diffs.append({
                "node_id": nid,
                "title": old_dict[nid].title,
                "status": "deleted",
                "old_hash": old_dict[nid].content_hash,
                "old_content": old_dict[nid].body
            })
        elif nid not in old_dict and nid in new_dict:
            added += 1
            diffs.append({
                "node_id": nid,
                "title": new_dict[nid].title,
                "status": "added",
                "new_hash": new_dict[nid].content_hash,
                "new_content": new_dict[nid].body
            })
        else:
            old_n = old_dict[nid]
            new_n = new_dict[nid]
            
            # Treat node as modified ONLY if its own content (title or body) changed
            if normalize_text(old_n.body) != normalize_text(new_n.body) or normalize_text(old_n.title) != normalize_text(new_n.title):
                modified += 1
                diffs.append({
                    "node_id": nid,
                    "title": new_n.title,
                    "old_title": old_n.title,
                    "status": "modified",
                    "old_hash": old_n.content_hash,
                    "new_hash": new_n.content_hash,
                    "old_content": old_n.body,
                    "new_content": new_n.body
                })
            else:
                diffs.append({
                    "node_id": nid,
                    "title": new_n.title,
                    "status": "unchanged",
                    "old_hash": old_n.content_hash,
                    "new_hash": new_n.content_hash
                })
                
    return {
        "old_version_id": old_version_id,
        "new_version_id": new_version_id,
        "summary": {
            "added": added,
            "deleted": deleted,
            "modified": modified
        },
        "diffs": diffs
    }
