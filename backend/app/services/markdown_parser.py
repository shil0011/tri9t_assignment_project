import hashlib
import re
from typing import List, Dict, Optional, Tuple

class ParsedNode:
    def __init__(self, title: str, level: int, body: str, node_id: str):
        self.title = title
        self.level = level
        self.body = body.strip()
        self.node_id = node_id
        self.children: List['ParsedNode'] = []
        self.content_hash = ""

    def calculate_hash(self):
        # Calculate hash based on title, level, body, and children hashes
        child_hashes = "".join([child.content_hash for child in self.children])
        content_to_hash = f"{self.title}|{self.level}|{self.body}|{child_hashes}"
        self.content_hash = hashlib.sha256(content_to_hash.encode('utf-8')).hexdigest()

def parse_markdown(markdown_text: str) -> List[ParsedNode]:
    """
    Parses a markdown string into a hierarchical list of ParsedNode.
    Returns the root level nodes.
    """
    lines = markdown_text.split('\n')
    
    # We will use a dummy root node to easily manage the hierarchy
    dummy_root = ParsedNode("ROOT", 0, "", "root")
    
    # Stack keeps track of the current path in the hierarchy
    stack: List[ParsedNode] = [dummy_root]
    
    current_node = None
    node_counter = 0

    # If the document doesn't start with a header, it's body for a 'Document Start' node
    # Let's collect initial text before any header.
    
    for line in lines:
        header_match = re.match(r'^(#{1,6})\s+(.*)', line)
        
        if header_match:
            level = len(header_match.group(1))
            title = header_match.group(2).strip()
            
            # Pop from stack until we find a parent with a lower level
            while len(stack) > 1 and stack[-1].level >= level:
                stack.pop()
                
            # The current top of stack is the parent
            parent = stack[-1]
            
            # Generate deterministic ID
            sibling_idx = len([c for c in parent.children if c.title == title])
            raw_id = f"{parent.node_id}::{title}::{sibling_idx}"
            node_id = "md-" + hashlib.md5(raw_id.encode('utf-8')).hexdigest()[:10]
            
            new_node = ParsedNode(title, level, "", node_id)
            
            parent.children.append(new_node)
            
            stack.append(new_node)
            current_node = new_node
        else:
            if current_node:
                current_node.body += line + "\n"
            else:
                # Text before any header
                title = "Document Intro"
                sibling_idx = len([c for c in dummy_root.children if c.title == title])
                raw_id = f"{dummy_root.node_id}::{title}::{sibling_idx}"
                node_id = "md-" + hashlib.md5(raw_id.encode('utf-8')).hexdigest()[:10]
                
                new_node = ParsedNode(title, 1, line + "\n", node_id)
                dummy_root.children.append(new_node)
                stack.append(new_node)
                current_node = new_node

    # Post process: strip bodies and calculate hashes bottom-up
    def process_node(node: ParsedNode):
        node.body = node.body.strip()
        for child in node.children:
            process_node(child)
        node.calculate_hash()

    for child in dummy_root.children:
        process_node(child)

    return dummy_root.children
