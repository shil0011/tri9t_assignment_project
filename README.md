# TraceWise AI

**AI-powered Medical Documentation QA & Traceability Platform**

TraceWise AI is an enterprise-grade platform designed for regulated medical device software development. It ingests technical markdown documentation, converts it into a structured hierarchical tree, tracks versions, generates QA test cases using Groq LLM (Llama 3), and intelligently detects when test cases become stale due to underlying documentation changes.

## Features

- **Document Versioning:** Upload markdown files and track structural changes.
- **Hierarchical Markdown Parser:** Automatically converts `#`, `##`, `###` headings into a traceable node tree.
- **Content Hashing:** Every node receives a SHA256 hash to track granular content modifications.
- **AI QA Generator:** Leverages Groq API (Llama 3) to generate structured test cases for selected nodes.
- **Staleness Engine:** Compares node hashes across document versions to flag test cases that have become outdated.
- **Premium UI:** Sleek, modern "dark mode" SaaS interface built with Next.js 15, Tailwind CSS, and Shadcn UI.

## Tech Stack

- **Backend:** Python 3.11, FastAPI, SQLAlchemy, SQLite, Pydantic, Groq.
- **Frontend:** Next.js 15, React, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion, TanStack Query.

## Quick Start

### 1. Setup Backend
```bash
cd backend
python -m venv venv
# Activate venv (Windows: .\venv\Scripts\Activate.ps1 | Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt

# Set your Groq API Key
set GROQ_API_KEY=your_key_here

# Run the FastAPI server
uvicorn app.main:app --reload
```

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Usage
1. Open `http://localhost:3000`.
2. Go to **Documents** and upload a `.md` file.
3. Explore the parsed hierarchy in the **Tree Explorer**.
4. Go to **QA Generator**, select your document, pick specific nodes, and generate test cases.
5. Upload a modified version of the same markdown file in **Documents** to simulate an update.
6. Check the **Staleness Center** to see which generated QA tests were invalidated by the changes.

## Architecture Notes

- **Database:** SQLite is used for simplicity, storing all node hashes, selections, and generated JSON QA arrays natively.
- **API Communication:** The Next.js frontend uses `axios` and `@tanstack/react-query` to fetch and mutate data seamlessly with optimistic UI updates.
- **Styling:** Custom CSS variables in `globals.css` provide a highly customized, low-contrast, off-white/slate theme typical of top-tier SaaS applications like Linear and Vercel.
