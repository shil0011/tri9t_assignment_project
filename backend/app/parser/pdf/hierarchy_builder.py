import uuid
import hashlib
from typing import List, Dict, Any
from .models import Block, BlockType
from ...services.markdown_parser import ParsedNode

def build_tree_from_blocks(blocks: List[Block]) -> List[ParsedNode]:
    """
    Constructs a hierarchy of ParsedNodes from a flat list of semantic blocks.
    - PARAGRAPH, LIST, IMAGE blocks are appended to the body of the current heading.
    - TABLE blocks become child nodes of the current heading.
    - HEADING blocks are pushed to the stack based on their inferred level.
    """
    dummy_root = ParsedNode("Document Root", 0, "", "root")
    dummy_root.node_type = BlockType.HEADING.value
    dummy_root.page_number = 1
    
    stack: List[ParsedNode] = [dummy_root]
    
    node_counter = 0
    current_heading = dummy_root
    
    for block in blocks:
        if block.block_type == BlockType.HEADING:
            level = block.level
            title = block.text.strip()
            
            # Resolve parent
            while len(stack) > 1 and stack[-1].level >= level:
                stack.pop()
                
            parent = stack[-1]
            
            # Generate deterministic ID
            sibling_idx = len([c for c in parent.children if c.title == title])
            raw_id = f"{parent.node_id}::{title}::{sibling_idx}"
            node_id = "pdf-" + hashlib.md5(raw_id.encode('utf-8')).hexdigest()[:10]
            
            new_node = ParsedNode(title, level, "", node_id)
            new_node.page_number = block.page_number
            new_node.node_type = BlockType.HEADING.value
            
            parent.children.append(new_node)
            
            stack.append(new_node)
            current_heading = new_node
            
        elif block.block_type == BlockType.TABLE:
            if current_heading.children and current_heading.children[-1].node_type == BlockType.TABLE.value:
                last_table_node = current_heading.children[-1]
                # Merge by stripping the markdown table headers of the second table if possible, 
                # or just appending. Appending is safest for Markdown rendering.
                last_table_node.body += "\n\n" + block.text
            else:
                # Derive descriptive title from the parent heading
                import re
                clean_title = re.sub(r'^(\d+(\.\d+)*\.?|Section\s+\d+|Chapter\s+\d+|Appendix\s+[A-Z])\s+', '', current_heading.title, flags=re.IGNORECASE).strip()
                table_title = f"{clean_title} Table" if clean_title and clean_title != "Document Root" else "Table"
                
                sibling_idx = len([c for c in current_heading.children if c.title == table_title])
                raw_id = f"{current_heading.node_id}::{table_title}::{sibling_idx}"
                node_id = "pdf-table-" + hashlib.md5(raw_id.encode('utf-8')).hexdigest()[:10]
                
                # The TABLE becomes a child node
                table_node = ParsedNode(table_title, current_heading.level + 1, block.text, node_id)
                table_node.page_number = block.page_number
                table_node.node_type = BlockType.TABLE.value
                
                current_heading.children.append(table_node)
            
        elif block.block_type == BlockType.LIST:
            if current_heading.children and current_heading.children[-1].node_type == BlockType.LIST.value:
                last_list_node = current_heading.children[-1]
                # Append the list item text (ensure it has a new line)
                last_list_node.body += "\n\n" + block.text
            else:
                title = "LIST"
                sibling_idx = len([c for c in current_heading.children if c.title == title])
                raw_id = f"{current_heading.node_id}::{title}::{sibling_idx}"
                node_id = "pdf-list-" + hashlib.md5(raw_id.encode('utf-8')).hexdigest()[:10]
                
                # The LIST becomes a child node
                list_node = ParsedNode(title, current_heading.level + 1, block.text, node_id)
                list_node.page_number = block.page_number
                list_node.node_type = BlockType.LIST.value
                
                current_heading.children.append(list_node)
                
        else: # PARAGRAPH, IMAGE, UNKNOWN
            text = block.text
            if text:
                if current_heading.body:
                    # Heuristic to detect if this block is a continuation of the previous block (e.g., across pages)
                    last_char = current_heading.body[-1] if current_heading.body else ''
                    if last_char not in ('.', '!', '?', ':', ';') and text[0].islower():
                        current_heading.body += " " + text
                    else:
                        current_heading.body += "\n\n" + text
                else:
                    current_heading.body = text

    # Clean up and hash
    def process_node(node: ParsedNode):
        node.body = node.body.strip()
        # Default node_type and page_number if missing
        if not hasattr(node, "node_type"):
            node.node_type = BlockType.HEADING.value if node.level > 0 else BlockType.PARAGRAPH.value
        if not hasattr(node, "page_number"):
            node.page_number = 1
            
        for child in node.children:
            process_node(child)
        node.calculate_hash()

    for child in dummy_root.children:
        process_node(child)

    return dummy_root.children
