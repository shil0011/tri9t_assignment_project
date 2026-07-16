import re
import numpy as np
from typing import List
from .models import Block, BlockType

def detect_headings(blocks: List[Block]) -> List[Block]:
    """
    Scans UNKNOWN blocks and classifies them as HEADING based on heuristics.
    Remaining UNKNOWN blocks are defaulted to PARAGRAPH.
    """
    if not blocks:
        return blocks
        
    # Calculate median font size for body text baseline
    sizes = [b.size for b in blocks if b.size > 0]
    median_size = np.median(sizes) if sizes else 12.0
    
    # Regex for heading numbers: 1, 1., 1.1, 1.1.1., Section 1, Chapter 1, Appendix A
    heading_number_pattern = re.compile(r'^(\d+(\.\d+)*\.?|Section\s+\d+|Chapter\s+\d+|Appendix\s+[A-Z])\s+', re.IGNORECASE)
    
    for block in blocks:
        if block.block_type != BlockType.UNKNOWN:
            continue
            
        text = block.text
        
        # Heuristic rules:
        is_large = block.size > median_size * 1.15
        is_bold = block.is_bold
        
        match = heading_number_pattern.match(text)
        has_heading_number = bool(match)
        is_short = len(text) < 150
        no_ending_punctuation = not text.endswith(('?', '!', ':')) # allow '.' since headings might end with a dot occasionally
        
        # If it has a clear explicit numbering and is short, force it to be a heading
        if has_heading_number and is_short:
            num_str = match.group(1).rstrip('.')
            
            # Prevent simple list items (like '1. Normal') from becoming headings 
            # if they share body font properties
            is_single_digit = num_str.isdigit() or (len(num_str) == 1 and num_str.isalpha())
            is_structural = "Section" in num_str or "Chapter" in num_str or "Appendix" in num_str
            
            if is_single_digit and not (is_bold or is_large) and not is_structural:
                # Do not force it to be a heading; let it fall through
                pass
            else:
                block.block_type = BlockType.HEADING
                if '.' in num_str:
                    block.level = len(num_str.split('.'))
                else:
                    block.level = 1
                continue

        # Compute a simple score (threshold = 2 to become a heading) for non-numbered text
        score = 0
        if is_large: score += 1
        if is_bold: score += 1
        if is_short and no_ending_punctuation: score += 1
        
        if len(text) > 300:
            score -= 2
            
        if score >= 2:
            block.block_type = BlockType.HEADING
            # 2. Size based fallback
            ratio = block.size / median_size
            if ratio > 1.5:
                block.level = 1
            elif ratio > 1.3:
                block.level = 2
            elif ratio > 1.1:
                block.level = 3
            else:
                block.level = 4
        # Do NOT mark as PARAGRAPH here. Leave as UNKNOWN for subsequent detectors.
            
    return blocks
