import fitz # PyMuPDF
from typing import List, Dict, Any

def extract_digital_text(file_path: str) -> List[Dict[str, Any]]:
    """
    Extracts text blocks from a digital PDF using PyMuPDF.
    Returns a list of blocks containing text, font size, weight, and layout metadata.
    """
    blocks = []
    doc = fitz.open(file_path)
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        # get_text("dict") extracts detailed formatting and position data
        page_dict = page.get_text("dict")
        
        for block in page_dict.get("blocks", []):
            if block.get("type") == 0:  # Text block
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        blocks.append({
                            "text": span.get("text", "").strip(),
                            "size": span.get("size"),
                            "flags": span.get("flags"), # Contains bold/italic info
                            "font": span.get("font"),
                            "bbox": span.get("bbox"),
                            "page_number": page_num + 1,
                            "type": "text"
                        })
            elif block.get("type") == 1: # Image block
                blocks.append({
                    "text": "[IMAGE]",
                    "size": 0,
                    "flags": 0,
                    "font": "",
                    "bbox": block.get("bbox"),
                    "page_number": page_num + 1,
                    "type": "image"
                })
                
    doc.close()
    return blocks
