import pdfplumber
from typing import List, Tuple
from .models import Block, BlockType

def get_tables_from_pdf(file_path: str) -> Tuple[List[Block], List[dict]]:
    """
    Extracts tables from the PDF using pdfplumber.
    Returns:
        - A list of Block objects with BlockType.TABLE
        - A list of bounding box dicts {"page": int, "bbox": (x0, top, x1, bottom)} 
          so the layout extractor can ignore these areas.
    """
    table_blocks = []
    table_bboxes = []
    
    with pdfplumber.open(file_path) as pdf:
        for i, page in enumerate(pdf.pages):
            page_number = i + 1
            tables = page.find_tables()
            if not tables:
                continue
                
            # Sort tables by top Y coordinate
            tables = sorted(tables, key=lambda t: t.bbox[1])
            
            merged_tables_data = []
            current_bbox = list(tables[0].bbox)
            current_data = tables[0].extract()
            
            for table in tables[1:]:
                bbox = table.bbox
                data = table.extract()
                
                # Check if tables are vertically close (less than 30 pts) and overlap horizontally
                y_dist = bbox[1] - current_bbox[3]
                x_overlap = min(current_bbox[2], bbox[2]) - max(current_bbox[0], bbox[0])
                
                if y_dist < 40 and x_overlap > -20:  # Allow slight negative overlap if they are roughly aligned
                    # Merge them
                    current_bbox[3] = max(current_bbox[3], bbox[3])
                    current_bbox[0] = min(current_bbox[0], bbox[0])
                    current_bbox[2] = max(current_bbox[2], bbox[2])
                    if data:
                        current_data.extend(data)
                else:
                    merged_tables_data.append({"bbox": tuple(current_bbox), "data": current_data})
                    current_bbox = list(bbox)
                    current_data = data
                    
            merged_tables_data.append({"bbox": tuple(current_bbox), "data": current_data})
            
            for table_dict in merged_tables_data:
                bbox = table_dict["bbox"]
                data = table_dict["data"]
                
                table_bboxes.append({
                    "page": page_number,
                    "bbox": bbox
                })
                
                if not data:
                    continue
                    
                # Format as markdown table
                markdown_lines = []
                for row_idx, row in enumerate(data):
                    clean_row = [str(cell).replace("\n", " ").strip() if cell else "" for cell in row]
                    markdown_lines.append("| " + " | ".join(clean_row) + " |")
                    
                    if row_idx == 0:
                        # header separator
                        markdown_lines.append("|" + "|".join(["---" for _ in clean_row]) + "|")
                        
                markdown_text = "\n".join(markdown_lines)
                
                block = Block(
                    text=markdown_text,
                    page_number=page_number,
                    bbox=bbox,
                    block_type=BlockType.TABLE
                )
                table_blocks.append(block)
                
    return table_blocks, table_bboxes
