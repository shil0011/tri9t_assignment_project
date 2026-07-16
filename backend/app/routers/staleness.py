from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. services.staleness_engine import detect_stale_generations
from .. import models
import json
import re

def normalize_text(text):
    if not text: return ""
    return re.sub(r'\s+', ' ', text).strip()

router = APIRouter(
    tags=["staleness"]
)

@router.post("/staleness/check")
def check_staleness(old_version_id: int, new_version_id: int, db: Session = Depends(get_db)):
    stale_count = detect_stale_generations(old_version_id, new_version_id, db)
    return {"status": "success", "stale_generations_flagged": stale_count}

@router.get("/staleness/{gen_id}")
def get_staleness(gen_id: int, db: Session = Depends(get_db)):
    gen = db.query(models.Generation).filter(models.Generation.id == gen_id).first()
    if not gen:
        raise HTTPException(status_code=404, detail="Generation not found")
        
    return {
        "generation_id": gen.id,
        "is_stale": gen.is_stale,
        "stale_reason": gen.stale_reason
    }

@router.get("/staleness/dashboard/data")
def get_staleness_dashboard(old_version_id: int, new_version_id: int, db: Session = Depends(get_db)):
    # 1. Trigger detection to ensure it's up to date
    detect_stale_generations(old_version_id, new_version_id, db)

    # 2. Compare nodes
    old_nodes = db.query(models.Node).filter(models.Node.version_id == old_version_id).all()
    new_nodes = db.query(models.Node).filter(models.Node.version_id == new_version_id).all()
    
    old_dict = {n.node_id: n for n in old_nodes}
    new_dict = {n.node_id: n for n in new_nodes}

    summary = {
        "total_requirements": len(old_nodes),
        "modified": 0,
        "added": 0,
        "deleted": 0,
        "qa_generated": 0,
        "fresh_qa": 0,
        "stale_qa": 0
    }

    changed_requirements = []
    
    all_node_ids = set(old_dict.keys()).union(set(new_dict.keys()))
    
    for nid in all_node_ids:
        if nid in old_dict and nid not in new_dict:
            summary["deleted"] += 1
            changed_requirements.append({
                "requirement_id": nid,
                "title": old_dict[nid].title,
                "section": old_dict[nid].title.split(" ")[0] if old_dict[nid].title else "",
                "change_type": "deleted",
                "severity": "High",
                "old_hash": old_dict[nid].content_hash,
                "new_hash": None,
                "old_content": old_dict[nid].body,
                "new_content": "",
                "version_introduced": old_version_id
            })
        elif nid not in old_dict and nid in new_dict:
            summary["added"] += 1
            changed_requirements.append({
                "requirement_id": nid,
                "title": new_dict[nid].title,
                "section": new_dict[nid].title.split(" ")[0] if new_dict[nid].title else "",
                "change_type": "added",
                "severity": "Low",
                "old_hash": None,
                "new_hash": new_dict[nid].content_hash,
                "old_content": "",
                "new_content": new_dict[nid].body,
                "version_introduced": new_version_id
            })
        else:
            old_n = old_dict[nid]
            new_n = new_dict[nid]
            if normalize_text(old_n.body) != normalize_text(new_n.body) or normalize_text(old_n.title) != normalize_text(new_n.title):
                summary["modified"] += 1
                changed_requirements.append({
                    "requirement_id": nid,
                    "title": new_n.title,
                    "section": new_n.title.split(" ")[0] if new_n.title else "",
                    "change_type": "modified",
                    "severity": "Medium",
                    "old_hash": old_n.content_hash,
                    "new_hash": new_n.content_hash,
                    "old_content": old_n.body,
                    "new_content": new_n.body,
                    "version_introduced": new_version_id
                })

    # 3. Get Affected QA (Test Cases)
    generations = db.query(models.Generation).filter(models.Generation.version_id == old_version_id).all()
    
    affected_qa = []
    
    for gen in generations:
        is_stale = gen.is_stale
        reasons = []
        if is_stale and gen.stale_reason:
            try:
                reasons = json.loads(gen.stale_reason)
            except:
                pass
        
        try:
            output = json.loads(gen.output)
            test_cases = output.get("test_cases", [])
        except:
            test_cases = []
            
        for idx, tc in enumerate(test_cases):
            summary["qa_generated"] += 1
            if is_stale:
                tc_req = tc.get("requirement_reference", gen.selection.name if gen.selection else "Unknown")
                
                # Filter reasons to only those affecting this specific TC
                tc_reasons = []
                for r in reasons:
                    # Find node in old_dict
                    node = old_dict.get(r.get("node_id"))
                    if node:
                        section = node.title.split(" ")[0] if node.title else ""
                        if not tc_req or tc_req == "Unknown" or section.startswith(tc_req) or tc_req in node.title:
                            tc_reasons.append(r)
                
                # If this TC's specific requirement didn't actually change, it's not stale!
                # Also, wait... we must cross-reference if the node was ACTUALLY flagged as changed in `changed_requirements`
                # because the staleness engine might have flagged it based on content_hash (whitespace mismatch)
                actual_changed = [r for r in tc_reasons if any(cr["requirement_id"] == r["node_id"] for cr in changed_requirements)]
                
                if not actual_changed:
                    summary["fresh_qa"] += 1
                    continue
                    
                summary["stale_qa"] += 1
                
                # Format change reason string
                reason_str = "Parent nodes modified"
                highest_severity = "Medium"
                action = "Review Expected Result"
                
                if any(r.get("status") == "deleted" for r in actual_changed):
                    reason_str = "Parent node deleted"
                    highest_severity = "High"
                    action = "Regenerate Test Case"
                    
                affected_qa.append({
                    "tc_id": f"TC-{gen.id}-{idx+1}",
                    "title": tc.get("title", f"Test Case {idx+1}"),
                    "requirement": tc_req,
                    "change_reason": reason_str,
                    "severity": highest_severity,
                    "status": "Stale",
                    "recommended_action": action,
                    "stale_reasons": actual_changed,
                    "generation_id": gen.id
                })
            else:
                summary["fresh_qa"] += 1

    return {
        "summary": summary,
        "changed_requirements": changed_requirements,
        "affected_qa": affected_qa
    }
