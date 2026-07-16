import fitz
from typing import List, Dict
from .models import Block, BlockType

def is_inside_table(bbox: tuple, page_num: int, table_bboxes: List[Dict]) -> bool:
    """
    Checks if a given bbox significantly overlaps with any table bounding box on the same page.
    bbox: (x0, y0, x1, y1)
    """
    bx0, by0, bx1, by1 = bbox
    b_area = (bx1 - bx0) * (by1 - by0)
    if b_area <= 0:
        return False
        
    for tb in table_bboxes:
        if tb["page"] != page_num:
            continue
        tx0, ty0, tx1, ty1 = tb["bbox"]
        
        # Calculate intersection
        ix0 = max(bx0, tx0)
        iy0 = max(by0, ty0)
        ix1 = min(bx1, tx1)
        iy1 = min(by1, ty1)
        
        if ix0 < ix1 and iy0 < iy1:
            i_area = (ix1 - ix0) * (iy1 - iy0)
            # If more than 50% of the block is inside the table, consider it part of the table
            if i_area / b_area > 0.5:
                return True
                
    return False

def extract_layout_blocks(file_path: str, table_bboxes: List[Dict]) -> List[Block]:
    """
    Extracts text and image blocks using PyMuPDF.
    Excludes blocks that fall inside table bounding boxes.
    """
    blocks = []
    doc = fitz.open(file_path)
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        page_dict = page.get_text("dict")
        
        for b in page_dict.get("blocks", []):
            bbox = b.get("bbox")
            if is_inside_table(bbox, page_num + 1, table_bboxes):
                continue
                
            if b.get("type") == 0:  # Text block
                current_text = ""
                current_size = 0
                current_flags = 0
                current_font = ""
                span_count = 0
                total_size = 0
                
                for line in b.get("lines", []):
                    line_text = ""
                    line_size_sum = 0
                    line_spans = 0
                    line_flags = 0
                    line_font = ""
                    
                    for span in line.get("spans", []):
                        text = span.get("text", "")
                        if not text.strip():
                            continue
                        line_text += text + " "
                        line_size_sum += span.get("size", 0)
                        line_spans += 1
                        if line_spans == 1:
                            line_flags = span.get("flags", 0)
                            line_font = span.get("font", "")
                            
                    line_text = line_text.strip()
                    if not line_text:
                        continue
                        
                    line_avg_size = line_size_sum / line_spans
                    
                    # Initialize
                    if span_count == 0:
                        current_size = line_avg_size
                        current_flags = line_flags
                        current_font = line_font
                        
                    import re
                    heading_pattern = re.compile(r'^(\d+(\.\d+)*\.?|Section\s+\d+|Chapter\s+\d+|Appendix\s+[A-Z])\s+', re.IGNORECASE)
                    
                    is_heading_line = bool(heading_pattern.match(line_text))
                    was_heading_line = bool(heading_pattern.match(current_text))
                    
                    # Break block if font properties change significantly, OR if this line is a heading, OR if we just finished a heading line
                    should_break = False
                    if span_count > 0:
                        if abs(line_avg_size - current_size) > 1.0 or line_flags != current_flags:
                            should_break = True
                        elif is_heading_line or (was_heading_line and not is_heading_line):
                            should_break = True

                    if should_break:
                        blocks.append(Block(
                            text=current_text.strip(),
                            page_number=page_num + 1,
                            bbox=bbox, # approximate for split block
                            size=total_size / span_count if span_count > 0 else current_size,
                            flags=current_flags,
                            font=current_font,
                            block_type=BlockType.UNKNOWN
                        ))
                        current_text = ""
                        span_count = 0
                        total_size = 0
                        current_size = line_avg_size
                        current_flags = line_flags
                        current_font = line_font
                        
                    current_text += line_text + " "
                    total_size += line_avg_size
                    span_count += 1
                    
                if current_text.strip():
                    blocks.append(Block(
                        text=current_text.strip(),
                        page_number=page_num + 1,
                        bbox=bbox,
                        size=total_size / span_count if span_count > 0 else current_size,
                        flags=current_flags,
                        font=current_font,
                        block_type=BlockType.UNKNOWN
                    ))
                
            elif b.get("type") == 1:  # Image block
                blocks.append(Block(
                    text="[IMAGE]",
                    page_number=page_num + 1,
                    bbox=bbox,
                    block_type=BlockType.IMAGE
                ))
                
    doc.close()
    return blocks
