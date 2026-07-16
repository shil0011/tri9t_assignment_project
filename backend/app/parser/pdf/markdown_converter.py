from typing import List
from ...services.markdown_parser import ParsedNode

def tree_to_markdown(nodes: List[ParsedNode]) -> str:
    """
    Converts a parsed node tree back into normalized Markdown.
    """
    md_lines = []
    
    def traverse(node: ParsedNode):
        if getattr(node, "node_type", "") == "TABLE":
            if node.body:
                md_lines.append(node.body)
                md_lines.append("")
        else:
            if node.level > 0:
                md_lines.append(f"{'#' * node.level} {node.title}")
                md_lines.append("")
            if node.body:
                md_lines.append(node.body)
                md_lines.append("")
            
        for child in node.children:
            traverse(child)
            
    for root in nodes:
        traverse(root)
        
    return "\n".join(md_lines)
