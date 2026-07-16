from enum import Enum
from typing import Optional, Dict, Any, List

class BlockType(str, Enum):
    HEADING = "HEADING"
    PARAGRAPH = "PARAGRAPH"
    TABLE = "TABLE"
    LIST = "LIST"
    IMAGE = "IMAGE"
    NOTE = "NOTE"
    WARNING = "WARNING"
    CAPTION = "CAPTION"
    FOOTER = "FOOTER"
    HEADER = "HEADER"
    PAGE_NUMBER = "PAGE_NUMBER"
    CODE = "CODE"
    UNKNOWN = "UNKNOWN"

class Block:
    def __init__(self, text: str, page_number: int, bbox: tuple = None, size: float = 0.0, 
                 flags: int = 0, font: str = "", block_type: BlockType = BlockType.UNKNOWN):
        self.text = text
        self.page_number = page_number
        self.bbox = bbox  # (x0, y0, x1, y1)
        self.size = size
        self.flags = flags  # PyMuPDF font flags (e.g. for bold)
        self.font = font
        self.block_type = block_type
        
        # Inferred fields
        self.is_bold = bool(flags & 2**4) if flags else False
        self.level: int = 0  # For headings (1, 2, 3...)
        self.is_table_cell = False

    def __repr__(self):
        return f"<Block {self.block_type.value} page={self.page_number} len={len(self.text)}>"
