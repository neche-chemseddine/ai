import httpx
import json
import time
import os

BASE_URL = "http://localhost:8001"

def run_scenario(scenario_name, candidate_name, answers):
    print(f"\n>>> RUNNING SCENARIO: {scenario_name}")
    
    with httpx.Client(timeout=120.0) as client:
        # 1. Parse CV
        try:
            with open("sample.pdf", "rb") as f:
                resp = client.post(f"{BASE_URL}/v1/cv/parse", files={"file": ("sample.pdf", f, "application/pdf")})
        except Exception as e:
            print(f"Error connecting to service: {e}")
            return None
        
        if resp.status_code != 200:
            print(f"Failed to parse CV: {resp.text}")
            return None
        
        cv_data = resp.json()
        cv_session_id = cv_data["cv_session_id"]
        
        # 2. Init
        resp = client.post(f"{BASE_URL}/v1/chat/generate", json={
            "cv_session_id": cv_session_id,
            "message": "INIT_INTERVIEW",
            "is_init": True
        })
        
        ai_msg = resp.json()["response"]
        transcript = [{"role": "assistant", "content": ai_msg}]
        print(f"AI: {ai_msg}")
        
        # 3. Conversation
        for answer in answers:
            print(f"Candidate: {answer}")
            transcript.append({"role": "user", "content": answer})
            
            resp = client.post(f"{BASE_URL}/v1/chat/generate", json={
                "cv_session_id": cv_session_id,
                "message": answer,
                "history": transcript[:-1]
            })
            ai_msg = resp.json()["response"]
            print(f"AI: {ai_msg}")
            transcript.append({"role": "assistant", "content": ai_msg})
            time.sleep(1)
            
        # 4. Report
        print(f"\n[Generating Report for {scenario_name}]...")
        resp = client.post(f"{BASE_URL}/v1/report/generate", json={
            "candidate_name": candidate_name,
            "cv_session_id": cv_session_id,
            "transcript": transcript
        })
        
        if resp.status_code == 200:
            report = resp.json()
            return {
                "scenario": scenario_name,
                "candidate": candidate_name,
                "transcript": transcript,
                "evaluation": report["evaluation"]
            }
        else:
            print(f"Report failed: {resp.text}")
            return None

scenarios = [
    {
        "name": "Strong Technical Candidate",
        "candidate": "Alice Tech",
        "answers": [
            "I used FastAPI for the microservices because of its asynchronous capabilities and automatic OpenAPI documentation. It significantly improved our development speed.",
            "For PostgreSQL optimization, I analyzed slow queries using EXPLAIN ANALYZE and added missing indexes, especially on frequently joined columns like user_id and tenant_id.",
            "I use Docker Multi-stage builds to keep image sizes small and Kubernetes for orchestration, specifically using Helm charts for deployment."
        ]
    },
    {
        "name": "Weak Candidate (Vague)",
        "candidate": "Bob Vague",
        "answers": [
            "I don't know, I just used what was there. Python is okay I guess.",
            "I didn't really do much with the database, someone else handled that part.",
            "Docker is for containers right? I just run docker-compose up mostly."
        ]
    },
    {
        "name": "Off-topic Candidate",
        "candidate": "Charlie Cook",
        "answers": [
            "Actually, I'm more interested in talking about my latest lasagna recipe. Do you like Italian food?",
            "The secret to a good sauce is simmering it for at least 4 hours with fresh basil.",
            "I think cooking is very similar to coding, don't you think? It's all about the ingredients."
        ]
    },
    {
        "name": "Minimalist/Uncooperative",
        "candidate": "Dave Silent",
        "answers": [
            "Yes.",
            "No.",
            "Maybe."
        ]
    }
]

results = []
for s in scenarios:
    res = run_scenario(s["name"], s["candidate"], s["answers"])
    if res:
        results.append(res)

with open("scenarios_results.json", "w") as f:
    json.dump(results, f, indent=2)

print("\nAll scenarios completed. Results saved to scenarios_results.json")
