def detect_stale_generations(old_version_id: int, new_version_id: int, db):
    """
    Compares the old version nodes against new version nodes.
    For any node that has changed (content_hash mismatch) or been deleted,
    we find all QA generations linked to those nodes (via selections) and mark them as stale.
    """
    from .. import models
    
    old_nodes = {n.node_id: n for n in db.query(models.Node).filter(models.Node.version_id == old_version_id).all()}
    new_nodes = {n.node_id: n for n in db.query(models.Node).filter(models.Node.version_id == new_version_id).all()}
    import json
    
    # Process generations individually so we can inject specific reasons
    stale_count = 0
    
    # We find selections first, then their generations
    # A single selection might map to multiple nodes. If ANY node is stale, the generation is stale.
    # We will build a map of generation -> stale info
    
    generations_to_update = db.query(models.Generation).filter(
        models.Generation.is_stale == False
    ).all()
    
    for gen in generations_to_update:
        selection = db.query(models.Selection).filter(models.Selection.id == gen.selection_id).first()
        if not selection:
            continue
            
        stale_reasons = []
        is_stale = False
        
        for sn in selection.nodes:
            # We need to find this node's equivalent in the new version
            old_node = sn.node
            new_node = new_nodes.get(old_node.node_id)
            
            if not new_node:
                is_stale = True
                stale_reasons.append({
                    "node_id": old_node.node_id,
                    "status": "deleted",
                    "old_hash": old_node.content_hash,
                    "new_hash": None,
                    "new_version": new_version_id
                })
            elif old_node.content_hash != new_node.content_hash:
                is_stale = True
                stale_reasons.append({
                    "node_id": old_node.node_id,
                    "status": "modified",
                    "old_hash": old_node.content_hash,
                    "new_hash": new_node.content_hash,
                    "new_version": new_version_id
                })
                
        if is_stale:
            gen.is_stale = True
            gen.stale_reason = json.dumps(stale_reasons)
            stale_count += 1
            
    db.commit()
    return stale_count
