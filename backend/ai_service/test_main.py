import pytest
from fastapi.testclient import TestClient
from main import app
from unittest.mock import MagicMock
import os

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_parse_cv_no_file():
    response = client.post("/v1/cv/parse")
    assert response.status_code == 422

def test_parse_cv_invalid_type():
    file = {'file': ('test.txt', b'hello', 'text/plain')}
    response = client.post("/v1/cv/parse", files=file)
    assert response.status_code == 400
    assert "Only PDF files are supported" in response.json()["detail"]

def test_parse_cv_mock_pdf(mocker):
    # Use MagicMock for objects that need magic method support like __iter__
    mock_doc = MagicMock()
    mock_page = MagicMock()
    mock_page.get_text.return_value = "Experience\n\nSoftware Engineer"
    mock_doc.__iter__.return_value = [mock_page]
    
    mocker.patch("fitz.open", return_value=mock_doc)

    file = {'file': ('test.pdf', b'%PDF-1.4 fake content', 'application/pdf')}
    response = client.post("/v1/cv/parse", files=file)
    
    assert response.status_code == 200
    assert "cv_session_id" in response.json()
    assert response.json()["chunk_count"] > 0

def test_parse_cv_real_file():
    # Path to sample.pdf in the root (it is mounted if we are on host, but here we need to copy it)
    if os.path.exists("sample.pdf"):
        with open("sample.pdf", "rb") as f:
            file = {'file': ('sample.pdf', f, 'application/pdf')}
            response = client.post("/v1/cv/parse", files=file)
            assert response.status_code == 200
            assert "cv_session_id" in response.json()
            assert response.json()["chunk_count"] > 0
