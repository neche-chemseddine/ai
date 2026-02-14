import requests
import json
import os

BASE_URL = "http://localhost:8001"

def log_interaction(scenario, role, message):
    print(f"[{scenario}] {role.upper()}: {message}")

def run_scenarios():
    print("# IntelliView AI: System Weakness Demonstration\n")

    # 1. Setup: Parse CV
    print("## Setup: Parsing CV (sample.pdf)")
    try:
        with open("sample.pdf", "rb") as f:
            resp = requests.post(f"{BASE_URL}/v1/cv/parse", files={"file": ("sample.pdf", f, "application/pdf")})
        
        cv_data = resp.json()
        cv_session_id = cv_data["cv_session_id"]
        print(f"Session ID: {cv_session_id}\n")
    except Exception as e:
        print(f"Setup failed: {e}")
        return

    # --- SCENARIO 1: MEMORY LOSS ---
    print("## Scenario 1: Memory Loss (History Ignored)")
    print("Description: Testing if the AI remembers its own previous question or the candidate's answer.\n")
    
    # Init
    resp = requests.post(f"{BASE_URL}/v1/chat/generate", json={"cv_session_id": cv_session_id, "message": "INIT", "is_init": True})
    ai_opener = resp.json()["response"]
    log_interaction("S1", "AI", ai_opener)

    # Turn 1
    candidate_msg = "I have 5 years of experience with Python, specifically building APIs with FastAPI."
    log_interaction("S1", "Candidate", candidate_msg)
    resp = requests.post(f"{BASE_URL}/v1/chat/generate", json={
        "cv_session_id": cv_session_id, 
        "message": candidate_msg,
        "history": [{"role": "assistant", "content": ai_opener}]
    })
    ai_followup = resp.json()["response"]
    log_interaction("S1", "AI", ai_followup)

    # Turn 2: The "Memory Test"
    candidate_msg = "Could you tell me why you asked that specifically?"
    log_interaction("S1", "Candidate", candidate_msg)
    resp = requests.post(f"{BASE_URL}/v1/chat/generate", json={
        "cv_session_id": cv_session_id, 
        "message": candidate_msg,
        "history": [
            {"role": "assistant", "content": ai_opener},
            {"role": "user", "content": "I have 5 years of experience with Python, specifically building APIs with FastAPI."},
            {"role": "assistant", "content": ai_followup}
        ]
    })
    log_interaction("S1", "AI", resp.json()["response"])
    print("\n> COMMENT: Note how the AI likely provides a generic response or asks a completely new question, failing to explain its previous reasoning because the history was not passed to the LLM.\n")

    # --- SCENARIO 2: RAG FAILURE (Short Answers) ---
    print("## Scenario 2: RAG Failure (Context Retrieval)")
    print("Description: Testing if short answers cause the system to lose CV context.\n")
    
    candidate_msg = "Yes, I am."
    log_interaction("S2", "Candidate", candidate_msg)
    resp = requests.post(f"{BASE_URL}/v1/chat/generate", json={
        "cv_session_id": cv_session_id, 
        "message": candidate_msg,
        "history": [] 
    })
    log_interaction("S2", "AI", resp.json()["response"])
    print("\n> COMMENT: Because 'Yes, I am' has no technical keywords, the vector search retrieves irrelevant chunks or nothing at all. The AI's response will likely be disconnected from the CV.\n")

    # --- SCENARIO 3: EVALUATION HALLUCINATION ---
    print("## Scenario 3: Evaluation Hallucination")
    print("Description: Generating a report for a very poor/short interview.\n")
    
    transcript = [
        {"role": "assistant", "content": "Hello, tell me about Python."},
        {"role": "user", "content": "I like it."},
        {"role": "assistant", "content": "What about FastAPI?"},
        {"role": "user", "content": "It is fast."}
    ]
    
    resp = requests.post(f"{BASE_URL}/v1/report/generate", json={
        "candidate_name": "Lazy Candidate",
        "cv_session_id": cv_session_id,
        "transcript": transcript
    })
    
    report_data = resp.json()
    print("### Generated Scores for 'Lazy Candidate':")
    print(json.dumps(report_data["evaluation"], indent=2))
    print("\n> COMMENT: Check if the AI gave high scores (e.g., > 5) for these 2-word answers. Often, models are too 'nice' or hallucinate skills based on the CV even if not demonstrated in the transcript.")

if __name__ == "__main__":
    run_scenarios()
