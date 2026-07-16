import time
from typing import Tuple, List, Dict, Any
from .models import Block, BlockType
from .table_detector import get_tables_from_pdf
from .layout_extractor import extract_layout_blocks
from .list_detector import detect_lists
from .heading_detector import detect_headings
from .hierarchy_builder import build_tree_from_blocks
from .validator import validate_tree
from .ocr import run_ocr_on_pdf
from ...services.markdown_parser import ParsedNode

def parse_pdf(file_path: str) -> Tuple[List[ParsedNode], Dict[str, Any]]:
    """
    Main orchestrator for the staged semantic PDF parsing pipeline.
    """
    start_time = time.time()
    ocr_used = False
    
    # Stage 1: Table Detection
    table_blocks, table_bboxes = get_tables_from_pdf(file_path)
    
    # Stage 2: Layout Extraction (Excluding tables)
    blocks = extract_layout_blocks(file_path, table_bboxes)
    
    # Scanned PDF Fallback
    total_text_len = sum(len(b.text) for b in blocks if b.block_type != BlockType.IMAGE)
    if total_text_len < 50:
        ocr_used = True
        ocr_dicts = run_ocr_on_pdf(file_path)
        blocks = []
        for d in ocr_dicts:
            blocks.append(Block(
                text=d["text"],
                page_number=d["page_number"],
                bbox=d["bbox"],
                size=d["size"],
                flags=d["flags"],
                font=d["font"],
                block_type=BlockType.UNKNOWN
            ))
            
    # Combine tables and blocks, sort by reading order (page, top-y, left-x)
    all_blocks = blocks + table_blocks
    all_blocks.sort(key=lambda b: (b.page_number, b.bbox[1] if b.bbox else 0, b.bbox[0] if b.bbox else 0))
    
    # Stage 3: Heading Detection & Classification
    all_blocks = detect_headings(all_blocks)
    
    # Stage 4: List Detection
    all_blocks = detect_lists(all_blocks)
    
    # Stages 5-7: Relationship Resolution & Hierarchy Builder
    tree = build_tree_from_blocks(all_blocks)
    
    # Stage 8: Validation
    tree = validate_tree(tree)
    
    metadata = {
        "processing_time": int(time.time() - start_time),
        "ocr_used": ocr_used,
        "parser_version": "2.0.0"
    }
    
    return tree, metadata
