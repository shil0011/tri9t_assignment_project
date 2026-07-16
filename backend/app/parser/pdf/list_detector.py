import re
from typing import List
from .models import Block, BlockType

def detect_lists(blocks: List[Block]) -> List[Block]:
    """
    Scans UNKNOWN blocks and classifies them as LIST if they match bullet points 
    or numbered list patterns.
    """
    
    # Common list prefixes:
    # Bullet points: •, -, *, ◦, ▪
    # Numbered: 1., 1), (1), a., A., i., I.
    list_pattern = re.compile(r'^(\•|\-|\*|\◦|\▪|\d+\.|\d+\)|\(\d+\)|[a-zA-Z]\.|\([a-zA-Z]\)|[ivxlcdmIVXLCDM]+\.)\s+')
    
    for block in blocks:
        if block.block_type != BlockType.UNKNOWN:
            continue
            
        if list_pattern.match(block.text):
            block.block_type = BlockType.LIST
            
    return blocks
