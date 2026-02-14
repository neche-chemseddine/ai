import requests
import json
import os
import sys

BASE_URL = "http://localhost:8001"

def run_scenario(name, description, steps):
    print(f"### Scenario: {name}")
    print(f"Description: {description}\n")
    sys.stdout.flush()
    
    # Setup
    with open("sample.pdf", "rb") as f:
        resp = requests.post(f"{BASE_URL}/v1/cv/parse", files={"file": ("sample.pdf", f, "application/pdf")})
    cv_session_id = resp.json()["cv_session_id"]
    
    transcript = []
    # Init
    resp = requests.post(f"{BASE_URL}/v1/chat/generate", json={"cv_session_id": cv_session_id, "message": "INIT", "is_init": True})
    ai_msg = resp.json()["response"]
    print(f"AI: {ai_msg}")
    sys.stdout.flush()
    transcript.append({"role": "assistant", "content": ai_msg})
    
    for i, step in enumerate(steps):
        print(f"Candidate: {step}")
        sys.stdout.flush()
        transcript.append({"role": "user", "content": step})
        
        resp = requests.post(f"{BASE_URL}/v1/chat/generate", json={
            "cv_session_id": cv_session_id, 
            "message": step,
            "history": transcript[:-1]
        })
        ai_msg = resp.json()["response"]
        print(f"AI: {ai_msg}")
        sys.stdout.flush()
        transcript.append({"role": "assistant", "content": ai_msg})

    print("\nGenerating Report...")
    sys.stdout.flush()
    resp = requests.post(f"{BASE_URL}/v1/report/generate", json={
        "candidate_name": name,
        "cv_session_id": cv_session_id,
        "transcript": transcript
    })
    print("Report Evaluation:")
    print(json.dumps(resp.json()["evaluation"], indent=2))
    print("-" * 50 + "\n")
    sys.stdout.flush()

if __name__ == "__main__":
    scenario = sys.argv[1] if len(sys.argv) > 1 else "1"
    
    if scenario == "1":
        run_scenario(
            "Topic Evasion", 
            "The candidate refuses to answer technical questions and talks about their cat.",
            [
                "The weather is lovely today, isn't it? I spent the morning playing with my cat.",
                "My cat's name is Whiskers. He's very fluffy. Do you like cats?"
            ]
        )
    elif scenario == "2":
        run_scenario(
            "Technical Confrontation",
            "The candidate asks the AI complex questions.",
            [
                "Can you explain the mathematical difference between a VAE and a GAN?",
                "Are you a robot or a person? You sound a bit scripted."
            ]
        )
    elif scenario == "3":
        run_scenario(
            "Mixed Competence",
            "A mix of high-quality and low-quality answers.",
            [
                "FastAPI uses Pydantic for data validation and Type Hints. It's built on Starlette.",
                "I don't know anything about Docker."
            ]
        )
