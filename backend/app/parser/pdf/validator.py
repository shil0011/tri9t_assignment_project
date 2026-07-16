import logging
from typing import List
from ...services.markdown_parser import ParsedNode
from .models import BlockType

logger = logging.getLogger(__name__)

def validate_tree(nodes: List[ParsedNode]) -> List[ParsedNode]:
    """
    Validates the generated node tree, logging warnings for potential issues:
    - Empty headings (no body and no children)
    - Invalid parent jumps (e.g., Level 1 -> Level 3 directly)
    """
    def check_node(node: ParsedNode, parent_level: int, parent_num_str: str = ""):
        # 1. Check for empty headings
        if getattr(node, "node_type", "") == BlockType.HEADING.value:
            if not node.body and not node.children:
                logger.warning(f"Empty heading detected: {node.title} (Page {getattr(node, 'page_number', 'N/A')})")
        
        
        # 2. Check for invalid heading jumps
        # E.g. Parent is H1 (1), Node is H3 (3). Difference is 2 (invalid jump)
        if node.level > parent_level + 1 and parent_level != 0:
            logger.warning(f"Invalid heading jump detected: {node.title} (Level {node.level}) under parent Level {parent_level}")
            
        # 3. Check correct parent-child numbering
        import re
        heading_number_pattern = re.compile(r'^(\d+(\.\d+)*\.?)\s+')
        match = heading_number_pattern.match(node.title)
        num_str = match.group(1).rstrip('.') if match else ""
        
        if num_str and parent_num_str:
            if not num_str.startswith(parent_num_str) and parent_level > 0:
                logger.warning(f"Invalid parent-child numbering: Parent is '{parent_num_str}', Child is '{num_str}'")
                
        # 4. Check for multiple sibling tables
        table_count = sum(1 for c in node.children if getattr(c, "node_type", "") == BlockType.TABLE.value)
        if table_count > 1:
            logger.warning(f"Multiple ({table_count}) sibling TABLE nodes found under '{node.title}'. Check for unmerged tables.")
            
        for child in node.children:
            check_node(child, node.level, num_str)
            
    for node in nodes:
        check_node(node, 0, "")
        
    return nodes
