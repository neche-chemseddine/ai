import httpx
import json
import time

BASE_URL = "http://localhost:8001"

def run_scenario(scenario_name, answers):
    print(f"\n>>> TESTING ROBUSTNESS: {scenario_name}")
    with httpx.Client(timeout=120.0) as client:
        # 1. Parse CV
        with open("sample.pdf", "rb") as f:
            resp = client.post(f"{BASE_URL}/v1/cv/parse", files={"file": ("sample.pdf", f, "application/pdf")})
        cv_session_id = resp.json()["cv_session_id"]
        
        # 2. Init
        resp = client.post(f"{BASE_URL}/v1/chat/generate", json={"cv_session_id": cv_session_id, "message": "INIT_INTERVIEW", "is_init": True})
        ai_msg = resp.json()["response"]
        transcript = [{"role": "assistant", "content": ai_msg}]
        print(f"AI: {ai_msg}")
        
        # 3. Conversation
        for answer in answers:
            print(f"Candidate: {answer}")
            transcript.append({"role": "user", "content": answer})
            resp = client.post(f"{BASE_URL}/v1/chat/generate", json={"cv_session_id": cv_session_id, "message": answer, "history": transcript[:-1]})
            ai_msg = resp.json()["response"]
            print(f"AI: {ai_msg}")
            transcript.append({"role": "assistant", "content": ai_msg})
            
        # 4. Report
        print(f"\n[Evaluating...] ")
        resp = client.post(f"{BASE_URL}/v1/report/generate", json={
            "candidate_name": "Robustness Test",
            "cv_session_id": cv_session_id,
            "transcript": transcript
        })
        print(json.dumps(resp.json()["evaluation"], indent=2))

print("--- SCENARIO 1: Candidate asks questions back ---")
run_scenario("Questioning Candidate", [
    "Before I answer, can you tell me what the best practices for FastAPI are?",
    "Why do you want to know about my PostgreSQL experience? What's your setup like?",
    "Can you just explain how Docker multi-stage builds work first?"
])

print("\n--- SCENARIO 2: Repetitive 'Good' Answer ---")
answer = "I used FastAPI with async/await and optimized PostgreSQL queries by adding indexes on frequently joined columns."
run_scenario("Repetitive Candidate", [answer, answer, answer])

