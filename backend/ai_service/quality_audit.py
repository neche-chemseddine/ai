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
sys.modules["groq"] = MagicMock()

# Mock the Llama class specifically
mock_llm_instance = MagicMock()
sys.modules["llama_cpp"] = MagicMock()
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
    mock_vector = MagicMock()
    mock_vector.tolist.return_value = [0.1] * 384
    main.embed_model.encode.return_value = mock_vector
    
    # Mock search result
    mock_point = MagicMock()
    mock_point.payload = {"text": "CV Context: React expert"}
    main.qdrant_client.query_points.return_value.points = [mock_point]
    
    # Mock call_llm response
    with patch("main.call_llm") as mock_call:
        mock_call.return_value = "Great! How do you handle state in React?"
        
        print("Executing generate_response...")
        resp = await main.generate_response(request)
        print(f"Response: {resp}")
    
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
    
    # Mock call_llm to return valid JSON but embedded in text
    with patch("main.call_llm") as mock_call:
        mock_call.return_value = "Evaluation results: { \"technical_score\": 5, \"communication_score\": 7, \"problem_solving_score\": 4, \"experience_match_score\": 5, \"strengths\": [\"Honest\"], \"weaknesses\": [\"Brief\"], \"summary\": \"Basic\" }"
        
        # Mock ReportPDF to avoid FPDF issues
        with patch("main.ReportPDF") as mock_pdf_class:
            mock_pdf_instance = mock_pdf_class.return_value
            print("Executing generate_report...")
            resp = await main.generate_report(request)
            print(f"Report Response: {resp}")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(audit_conversation_logic())
    loop.run_until_complete(audit_report_logic())

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(audit_conversation_logic())
    loop.run_until_complete(audit_report_logic())
