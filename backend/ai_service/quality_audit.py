import sys
from unittest.mock import MagicMock, patch
import asyncio

# Mock dependencies before importing main
mock_qdrant = MagicMock()
sys.modules["qdrant_client"] = MagicMock()
sys.modules["qdrant_client.http"] = MagicMock()
sys.modules["sentence_transformers"] = MagicMock()
sys.modules["llama_cpp"] = MagicMock()
sys.modules["huggingface_hub"] = MagicMock()
sys.modules["fpdf"] = MagicMock()
sys.modules["fitz"] = MagicMock()

# Mock the Llama class specifically
mock_llm_instance = MagicMock()
sys.modules["llama_cpp"].Llama.return_value = mock_llm_instance

import main

async def audit_conversation_logic():
    print("--- Auditing Conversation Logic ---")
    
    # Test 1: History usage
    request = main.ChatRequest(
        cv_session_id="test-session",
        message="I have experience with React.",
        history=[
            {"role": "assistant", "content": "Hello! What is your experience with frontend?"},
            {"role": "user", "content": "I have experience with React."}
        ]
    )
    
    # We need to mock dependencies in main.py
    main.qdrant_client = MagicMock()
    main.embed_model = MagicMock()
    main.embed_model.encode.return_value = [0.1] * 384
    
    # Mock search result
    mock_point = MagicMock()
    mock_point.payload = {"text": "CV Context: React expert"}
    main.qdrant_client.query_points.return_value.points = [mock_point]
    
    # Mock LLM response
    main.llm.return_value = {"choices": [{"text": "Great! How do you handle state in React?"}]}
    
    print("Executing generate_response...")
    resp = await main.generate_response(request)
    print(f"Response: {resp}")
    
    # The actual prompt used can be inspected if we capture it
    # But looking at main.py code:
    # full_prompt = f\"<s>[INST] {system_prompt}\n\nCandidate: {request.message} [/INST]\"
    # It's clear history is ignored.

async def audit_report_logic():
    print("\n--- Auditing Report Logic ---")
    
    transcript = [
        {"role": "assistant", "content": "Tell me about React."},
        {"role": "user", "content": "It's a library."}
    ]
    request = main.EvaluationRequest(
        candidate_name="Test Candidate",
        transcript=transcript,
        cv_session_id="test-session"
    )
    
    # Mock LLM to return valid JSON but embedded in text
    main.llm.return_value = {"choices": [{"text": "Evaluation results: { \"technical_score\": 5, \"communication_score\": 7, \"problem_solving_score\": 4, \"experience_match_score\": 5, \"strengths\": [\"Honest\"], \"weaknesses\": [\"Brief\"], \"summary\": \"Basic\" }"}]}
    
    # Mock PDF output to avoid file system issues
    with patch("main.ReportPDF.output") as mock_pdf_output:
        print("Executing generate_report...")
        resp = await main.generate_report(request)
        print(f"Report Response: {resp}")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(audit_conversation_logic())
    loop.run_until_complete(audit_report_logic())
