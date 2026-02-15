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
            "We used FastAPI because its type hinting with Pydantic reduced our runtime errors by 30%. I utilized dependency injection for database sessions, allowing us to swap the real PG session for a mock in our unit tests.",
            "I used EXPLAIN (ANALYZE, BUFFERS) to optimize the query. The bottleneck was a sequential scan on a 5M row table; adding a B-tree index on the 'email' and 'created_at' columns reduced execution time from 500ms to 12ms.",
            "In Kubernetes, I configured Horizontal Pod Autoscalers (HPA) using custom metrics from Prometheus. I set the target CPU utilization to 70% and used PodDisruptionBudgets to ensure high availability during node upgrades."
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
    },
    {
        "name": "Perfect Candidate",
        "candidate": "Sophia Architect",
        "answers": [
            "To achieve the 40% latency reduction, I first enabled pg_stat_statements to identify the top 5 most time-consuming queries. One major bottleneck was a nested loop join on the 'orders' and 'tenants' tables. I replaced it with a hash join by adjusting the work_mem and adding a composite index on (tenant_id, created_at DESC).",
            "In FastAPI, I implemented a custom middleware for dependency injection and used SQLAlchemy 2.0 with asyncpg for true non-blocking database I/O. For connection pooling, I tuned the QueuePool to a max_overflow of 20 and a pool_size of 10 to handle the spike in traffic during our peak hours without exhausting the PG max_connections.",
            "For the microservices communication, I avoided synchronous REST calls where possible and used a sidecar pattern with Envoy for service discovery. We used gRPC for internal high-throughput communication between the order service and the inventory service to reduce serialization overhead compared to JSON."
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
