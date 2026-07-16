# Approach Document: TraceWise AI

This document outlines the core architectural and algorithmic decisions made during the development of the TraceWise AI platform. 

---

## 1. Data Model

The data model was designed to ensure rigorous forward and backward traceability across the entire pipeline. We use a relational database (SQLite via SQLAlchemy) with the following core entities:

- **Document**: The top-level entity representing a logical document (e.g., "CT-200 Manual").
- **Version**: A specific iteration of a document (v1, v2, etc.). Enables side-by-side historical tracking.
- **Node**: A single hierarchical section of parsed text. 
  - Nodes form a self-referential tree via `parent_id`.
  - Every node maintains a deterministic `node_id` for cross-version tracking.
  - Every node has a `content_hash` calculated in a Merkle-tree fashion (a node's hash includes its children's hashes) for extremely fast and accurate change detection.
- **Selection**: A user-defined grouped subset of Nodes (Many-to-Many via `SelectionNode`). This allows the LLM to process a specific, scoped batch of requirements rather than the entire document.
- **Generation**: The result of an LLM invocation. Ties together the `Selection`, the `Version`, the exact LLM prompt, the model used, and the structured JSON output (the test cases). Contains `is_stale` and `stale_reason` flags for the staleness engine.

---

## 2. Tree-Parsing Decisions & Irregularities

Parsing unstructured documents (especially PDFs) into a strict hierarchy is inherently lossy. We approached this using a multi-stage pipeline:

1. **Text & Layout Extraction**: Uses `PyMuPDF` (fitz) and `pdfplumber` to extract text blocks along with their visual layout metadata (font size, weight, coordinates).
2. **OCR Fallback**: If a page is entirely images (scanned), the pipeline automatically falls back to `pytesseract` to extract text.
3. **Heading Detection**: Instead of relying solely on regex (which fails on PDFs), we identify headings heuristically by finding text blocks with larger font sizes and bold weights compared to the page's median font size.
4. **Hierarchy Builder**: We reconstruct the tree by pushing/popping nodes onto a stack based on heading levels (H1 > H2 > H3).

**Handling Irregularities:**
- **Missing/Orphaned Text**: Text found before any heading is assigned to a synthetic "Document Intro" node.
- **PDF Extraction Artifacts (Whitespace/Line Breaks)**: PDFs often break paragraphs randomly across lines or pages. We use aggressive whitespace normalization (`re.sub(r'\s+', ' ', text).strip()`) to prevent artificial line breaks from affecting content hashes and diffs.
- **Tables and Lists**: Detected using layout bounding boxes and preserved in Markdown format (`| col | col |` and `- item`) so the LLM can understand the structured data natively.

---

## 3. Version-Matching Strategy & Known Failure Modes

To determine if a test case is "Stale", we must accurately match nodes between Version A and Version B.

**The Strategy:**
1. Generate a deterministic `node_id` for every parsed node based on a hash of its parent's ID, its exact title, and its sibling index.
2. In the Staleness Engine, cross-reference Version A's nodes against Version B's nodes using this `node_id`.
3. If a node is missing in Version B, it is marked as `deleted`.
4. If a node is present in both, compare their `content_hash` values (which ignores whitespace artifacts due to normalization). If they differ, the node is marked as `modified`.
5. Flag any QA generations linked to these modified/deleted nodes as `Stale`.

**Known Failure Modes:**
1. **Title Changes**: Because the `node_id` includes the section title, if a user renames "2.1 Specifications" to "2.1 General Specs", the ID changes. The engine will incorrectly see this as the deletion of the old node and the addition of a new one, rather than a modification.
2. **Reordering**: Because the `node_id` includes the `sibling_idx`, swapping the order of two subsections will change their IDs, again causing false additions/deletions.

---

## 4. LLM Prompt Design & Structured Output Strategy

Medical QA generation requires high precision and deterministic formatting.

**Prompt Engineering:**
- **Role Assignment**: "You are a Senior Medical Device QA Engineer."
- **Negative Constraints**: LLMs tend to over-generate. We use strict negative bounds: *"Never generate interview questions. Never invent functionality. Only use information explicitly present."*
- **Schema Enforcement**: We provide an exact JSON schema in the prompt that maps 1:1 with our frontend expectations (title, requirement_reference, priority, category, preconditions, steps, expected_result, reasoning).

**Structured Output & Retry Strategy:**
- We leverage Groq's `response_format={"type": "json_object"}` to guarantee the output is parseable JSON.
- The raw JSON string is loaded and validated immediately against a strict Pydantic model (`TestCaseList`).
- **Retry Mechanism**: If the LLM hallucinates an invalid key type or fails Pydantic validation (e.g., providing a string for `steps` instead of an array), we catch the `ValidationError` and automatically retry the LLM call one time. If the second attempt fails, it surfaces a graceful error to the user rather than crashing the system.

---

## 5. What I'd Do Differently With More Time

1. **Semantic Version Matching (Embeddings)**
   Instead of relying on brittle deterministic `node_id`s that break on title changes, I would generate vector embeddings for every node using a lightweight model like `all-MiniLM-L6-v2`. When comparing versions, I would use Cosine Similarity to find the "closest match" node in the new version, gracefully handling renames and reordering.

2. **Streaming LLM Responses (SSE)**
   Currently, the UI blocks until the entire JSON test suite is generated (which can take 2-4 seconds). I would implement Server-Sent Events (SSE) combined with a streaming JSON parser (like `ijson`) to stream the test cases to the frontend one by one, dramatically improving perceived performance.

3. **Multi-Modal Vision Parsing**
   Heuristic PDF parsing (detecting fonts and boxes) is inherently fragile and fails on complex multi-column layouts or diagrams. With more time, I would replace the `pdfplumber` pipeline with a Vision-Language Model (VLM) like GPT-4o or Claude 3.5 Sonnet to convert PDF page images directly into perfect markdown.

4. **Graph Database for Traceability**
   While SQLite relational tables work for basic traceability, traversing deep N:M relationships (Document -> Version -> Node -> Selection -> Generation -> Test Case) gets slow and complex in SQL. I would migrate the traceability layer to a native Graph Database like Neo4j, making complex compliance queries (e.g., "Find all High Priority test cases affected by a change to Document X") trivial and highly performant.
