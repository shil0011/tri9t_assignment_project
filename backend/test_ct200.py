import sys
import os

# Ensure the backend directory is in the sys path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.parser.pdf.loader import parse_pdf
from app.services.markdown_parser import ParsedNode

def print_tree(nodes, f, depth=0):
    for node in nodes:
        indent = "  " * depth
        node_type = getattr(node, "node_type", "UNKNOWN")
        f.write(f"{indent}- [{node_type}] {node.title} (Level {node.level})\n")
        if node.body:
            body_snippet = node.body[:100].replace('\n', ' ')
            if len(node.body) > 100:
                body_snippet += "..."
            f.write(f"{indent}  Body snippet: {body_snippet}\n")
        print_tree(node.children, f, depth + 1)

if __name__ == "__main__":
    pdf_path = r"C:\Users\maina\Downloads\ct200_manual.pdf"
    print(f"Parsing {pdf_path}...")
    try:
        tree, metadata = parse_pdf(pdf_path)
        print(f"Parsing completed in {metadata['processing_time']}s. OCR used: {metadata['ocr_used']}")
        with open("tree_output.txt", "w", encoding="utf-8") as f:
            f.write("--- EXTRACTED TREE ---\n\n")
            print_tree(tree, f)
        print("Tree written to tree_output.txt")
    except Exception as e:
        print(f"Error parsing PDF: {e}")
