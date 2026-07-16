import os
import json
from groq import Groq
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ValidationError

class TestCase(BaseModel):
    title: str
    requirement_reference: str
    priority: str
    category: str
    preconditions: List[str]
    steps: List[str]
    expected_result: str
    reasoning: str

class TestCaseList(BaseModel):
    test_cases: List[TestCase]

def generate_qa_test_cases(markdown_text: str, model: str = "llama-3.3-70b-versatile") -> Dict[str, Any]:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set")

    client = Groq(api_key=api_key)

    prompt = f"""
You are a Senior Medical Device QA Engineer.
Generate ONLY professional QA TEST CASES.
Never generate interview questions.
Never generate quizzes.
Never generate question-answer pairs.
Never invent functionality.
Only use information explicitly present in the provided documentation.
If information is missing, write "Not specified in the documentation."
Generate between 3 and 5 QA Test Cases.

Every test case must include:
- title
- requirement_reference
- priority
- category
- preconditions
- steps
- expected_result
- reasoning

Return STRICT JSON in this exact format:
{{
  "test_cases": [
    {{
      "title": "...",
      "requirement_reference": "...",
      "priority": "High | Medium | Low",
      "category": "Functional | Safety | Boundary | Negative | Performance | Validation | Usability",
      "preconditions": ["...", "..."],
      "steps": ["...", "..."],
      "expected_result": "...",
      "reasoning": "..."
    }}
  ]
}}

Documentation:
{markdown_text}
"""

    def call_llm() -> str:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model=model,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        return chat_completion.choices[0].message.content

    # Attempt 1
    response_content = call_llm()
    try:
        data = json.loads(response_content)
        TestCaseList.model_validate(data)
        return data
    except (json.JSONDecodeError, ValidationError) as e:
        # Retry once
        try:
            response_content_retry = call_llm()
            data_retry = json.loads(response_content_retry)
            TestCaseList.model_validate(data_retry)
            return data_retry
        except (json.JSONDecodeError, ValidationError) as e2:
            raise ValueError(f"Failed to generate valid QA test cases after retry. Parser error: {e2}")
