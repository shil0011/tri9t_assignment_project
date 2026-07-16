import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import documents, generation, staleness, compare

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TraceWise AI API",
    description="Backend API for AI-powered Medical Documentation QA & Traceability Platform",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/api")
app.include_router(generation.router, prefix="/api")
app.include_router(staleness.router, prefix="/api")
app.include_router(compare.router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "ok"}
