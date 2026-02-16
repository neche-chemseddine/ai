from fastapi.testclient import TestClient
import json
import os

def run_full_test():
    print("=== STARTING FULL PIPELINE TEST ===")
    
    from main import app
    client = TestClient(app)
    
    # 1. Parse CV
    print("\n[Step 1] Parsing sample.pdf...")
    if not os.path.exists("./sample.pdf"):
        print("Error: sample.pdf not found in current directory")
        return

    with open("./sample.pdf", "rb") as f:
        response = client.post("/v1/cv/parse", files={"file": ("sample.pdf", f, "application/pdf")})
    
    if response.status_code != 200:
        print(f"Failed to parse CV: {response.text}")
        return
    
    cv_data = response.json()
    cv_session_id = cv_data["cv_session_id"]
    print(f"CV Parsed. Session ID: {cv_session_id}")
    print(f"Chunks found: {cv_data['chunk_count']}")
    print(f"Preview: {cv_data['preview'][:1]}")

    # 2. Initialization (First message)
    print("\n[Step 2] Initializing Interview (AI sends first message)...")
    response = client.post("/v1/chat/generate", json={
        "cv_session_id": cv_session_id,
        "message": "INIT_INTERVIEW",
        "is_init": True
    })
    
    opener = response.json()["response"]
    print(f"AI: {opener}")

    # 3. Simulate 3-turn conversation
    transcript = []
    # AI just asked the first question in 'opener'
    transcript.append({"role": "assistant", "content": opener})
    
    mock_answers = [
        "I have experience with Python and NestJS. I usually build microservices.",
        "I use Docker for containerization and GitHub Actions for CI/CD. For scaling, I look at bottleneck identification.",
        "In my last project, I optimized a SQL query that was taking 2 seconds by adding a composite index and refactoring the JOIN logic."
    ]

    for i, answer in enumerate(mock_answers):
        print(f"\nCandidate: {answer}")
        transcript.append({"role": "user", "content": answer})
        
        print(f"[Step 3.{i+1}] AI generating follow-up...")
        response = client.post("/v1/chat/generate", json={
            "cv_session_id": cv_session_id,
            "message": answer,
            "history": transcript[:-1]
        })
        ai_msg = response.json()["response"]
        print(f"AI: {ai_msg}")
        transcript.append({"role": "assistant", "content": ai_msg})

    # 4. Test Quiz Evaluation
    print("\n[Step 4] Testing Quiz Evaluation...")
    quiz_data = [
        {"question": "What is Python's GIL?", "correct_answer": 0},
        {"question": "How does useMemo work in React?", "correct_answer": 1}
    ]
    candidate_answers = {"0": 0, "1": 2} # One correct, one wrong
    
    response = client.post("/v1/quiz/evaluate", json={
        "quiz_data": quiz_data,
        "candidate_answers": candidate_answers
    })
    if response.status_code == 200:
        print(f"Quiz Score: {response.json()['score']}/10")
        print(f"Critique: {response.json()['critique']}")
    else:
        print(f"Quiz evaluation failed: {response.text}")

    # 5. Test Coding Evaluation
    print("\n[Step 5] Testing Coding Evaluation...")
    response = client.post("/v1/coding/evaluate", json={
        "problem_statement": "Implement a thread-safe rate limiter.",
        "solution": "import threading\nclass RateLimiter:\n    def __init__(self):\n        self.lock = threading.Lock()\n    def check(self):\n        with self.lock: return True",
        "test_results": {"status": "success"}
    })
    if response.status_code == 200:
        eval_data = response.json()
        print(f"Coding Score: {eval_data['score']}/10")
        print(f"Complexity: {eval_data['complexity']}")
        print(f"Critique: {eval_data['critique']}")
    else:
        print(f"Coding evaluation failed: {response.text}")

    # 6. Generate Final Integrated Report
    print("\n[Step 6] Generating Final Integrated Evaluation Report...")
    response = client.post("/v1/report/generate", json={
        "candidate_name": "Test Candidate",
        "cv_session_id": cv_session_id,
        "transcript": transcript,
        "quiz_results": {"score": 5.0, "critique": "Average knowledge"},
        "coding_solution": "class RateLimiter: ...",
        "coding_results": {"score": 8, "complexity": "O(1)"}
    })
    
    if response.status_code == 200:
        report_data = response.json()
        print("\n=== FINAL EVALUATION ===")
        print(json.dumps(report_data["evaluation"], indent=2))
        print(f"\nReport Artifact: {report_data['report_filename']}")
    else:
        print(f"Report generation failed: {response.text}")

if __name__ == "__main__":
    run_full_test()
