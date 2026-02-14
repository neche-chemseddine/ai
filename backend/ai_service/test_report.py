from fastapi.testclient import TestClient
from main import app
import os

client = TestClient(app)

def test_generate_report_artifact():
    # Mock data for evaluation
    payload = {
        "candidate_name": "John Doe Test",
        "cv_session_id": "test-session-id",
        "transcript": [
            {"role": "assistant", "content": "Hello John, can you tell me about your experience with React?"},
            {"role": "user", "content": "I have 5 years of experience building complex SPAs with React and Redux."},
            {"role": "assistant", "content": "Great. How do you handle state management?"},
            {"role": "user", "content": "I prefer using Context API for small apps and Redux Toolkit for larger enterprise applications."}
        ]
    }

    print("\nCalling report generation endpoint...")
    response = client.post("/v1/report/generate", json=payload)
    
    if response.status_code != 200:
        print(f"Error response: {response.text}")
        return
        
    data = response.json()
    
    if "report_filename" not in data:
        print("Failed: report_filename not in response")
        return
        
    filename = data["report_filename"]
    print(f"Generated filename: {filename}")
    
    from main import REPORTS_DIR
    file_path = os.path.join(REPORTS_DIR, filename)
    
    if os.path.exists(file_path):
        print(f"Success! PDF Artifact created at: {file_path} ({os.path.getsize(file_path)} bytes)")
    else:
        print(f"Failed: Artifact not found at {file_path}")

if __name__ == "__main__":
    test_generate_report_artifact()
