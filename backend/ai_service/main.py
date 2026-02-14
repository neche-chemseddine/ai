from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import fitz  # PyMuPDF
import os
from qdrant_client import QdrantClient
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer
from llama_cpp import Llama
from huggingface_hub import hf_hub_download
import uuid
from typing import List, Optional
from fpdf import FPDF
import json
import re

app = FastAPI(title="IntelliView AI Service")

# Initialize models and client
embed_model = SentenceTransformer('all-MiniLM-L6-v2')
qdrant_host = os.getenv("QDRANT_HOST", "localhost")
qdrant_client = QdrantClient(host=qdrant_host, port=6333)

# Download and load LLM
print("Loading LLM...")
MODEL_PATH = hf_hub_download(
    repo_id="TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
    filename="mistral-7b-instruct-v0.2.Q4_K_M.gguf"
)
llm = Llama(model_path=MODEL_PATH, n_ctx=2048, n_threads=4)
print("LLM Loaded.")

COLLECTION_NAME = "cv_chunks"
REPORTS_DIR = "/home/chems/.gemini/tmp/reports"
os.makedirs(REPORTS_DIR, exist_ok=True)

class ChatRequest(BaseModel):
    cv_session_id: str
    message: str
    history: List[dict] = []

class EvaluationRequest(BaseModel):
    candidate_name: str
    transcript: List[dict]
    cv_session_id: str

# Ensure collection exists
try:
    qdrant_client.get_collection(COLLECTION_NAME)
except Exception:
    qdrant_client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE),
    )

class ReportPDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 15)
        self.cell(0, 10, 'IntelliView AI - Candidate Evaluation Report', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/v1/cv/parse")
async def parse_cv(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        content = await file.read()
        doc = fitz.open(stream=content, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        
        chunks = [c.strip() for c in text.split("\n\n") if c.strip()]
        cv_session_id = str(uuid.uuid4())
        
        points = []
        for i, chunk in enumerate(chunks):
            vector = embed_model.encode(chunk).tolist()
            points.append(models.PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={
                    "text": chunk,
                    "cv_session_id": cv_session_id,
                    "chunk_index": i
                }
            ))
        
        qdrant_client.upsert(
            collection_name=COLLECTION_NAME,
            points=points
        )
        
        return {
            "filename": file.filename,
            "cv_session_id": cv_session_id,
            "chunk_count": len(chunks),
            "preview": chunks[:3]
        }
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error parsing CV: {str(e)}")

@app.post("/v1/chat/generate")
async def generate_response(request: ChatRequest):
    try:
        query_vector = embed_model.encode(request.message).tolist()
        search_result = qdrant_client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vector,
            query_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="cv_session_id",
                        match=models.MatchValue(value=request.cv_session_id),
                    )
                ]
            ),
            limit=3
        ).points
        
        context = "\n".join([hit.payload["text"] for hit in search_result])
        
        system_prompt = f"""You are an expert technical interviewer. 
Use the following CV context to interview the candidate. 
Be professional, concise, and ask relevant technical questions.

CV CONTEXT:
{context}
"""
        full_prompt = f"<s>[INST] {system_prompt}\n\nCandidate: {request.message} [/INST]"
        
        output = llm(full_prompt, max_tokens=256, stop=["[INST]", "</s>"], echo=False)
        response_text = output["choices"][0]["text"].strip()
        
        return {"response": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/report/generate")
async def generate_report(request: EvaluationRequest):
    try:
        # 1. Prepare Transcript for LLM
        transcript_text = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in request.transcript])
        
        # 2. Ask LLM to evaluate
        eval_prompt = f"""<s>[INST] Analyze the following technical interview transcript and provide a structured evaluation.
Return only a JSON object with the following fields:
- technical_score (1-10)
- communication_score (1-10)
- problem_solving_score (1-10)
- experience_match_score (1-10)
- strengths (list of strings)
- weaknesses (list of strings)
- summary (string)

TRANSCRIPT:
{transcript_text}
[/INST]"""

        output = llm(eval_prompt, max_tokens=1024, stop=["</s>"], echo=False)
        eval_json_str = output["choices"][0]["text"].strip()
        
        # Extract JSON from potential prose
        match = re.search(r'\{.*\}', eval_json_str, re.DOTALL)
        if match:
            evaluation = json.loads(match.group())
        else:
            raise ValueError("Could not parse LLM evaluation as JSON")

        # 3. Generate PDF
        pdf = ReportPDF()
        pdf.add_page()
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 10, f"Candidate: {request.candidate_name}", 0, 1)
        
        # Score Grid
        pdf.set_font('Arial', 'B', 10)
        pdf.cell(90, 10, f"Technical Depth: {evaluation.get('technical_score')}/10", 1, 0)
        pdf.cell(90, 10, f"Communication: {evaluation.get('communication_score')}/10", 1, 1)
        pdf.cell(90, 10, f"Problem Solving: {evaluation.get('problem_solving_score')}/10", 1, 0)
        pdf.cell(90, 10, f"Experience Match: {evaluation.get('experience_match_score')}/10", 1, 1)
        
        pdf.ln(5)
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(0, 10, "Executive Summary:", 0, 1)
        pdf.set_font('Arial', '', 11)
        pdf.multi_cell(0, 8, evaluation.get('summary', 'No summary provided.'))
        
        pdf.ln(5)
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(0, 10, "Key Strengths:", 0, 1)
        pdf.set_font('Arial', '', 11)
        for s in evaluation.get('strengths', []):
            pdf.cell(0, 8, f"- {s}", 0, 1)
            
        pdf.ln(5)
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(0, 10, "Areas for Improvement:", 0, 1)
        pdf.set_font('Arial', '', 11)
        for w in evaluation.get('weaknesses', []):
            pdf.cell(0, 8, f"- {w}", 0, 1)

        report_filename = f"report_{uuid.uuid4()}.pdf"
        report_path = os.path.join(REPORTS_DIR, report_filename)
        pdf.output(report_path)

        return {
            "evaluation": evaluation,
            "report_filename": report_filename
        }
    except Exception as e:
        print(f"Error generating report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/v1/report/download/{filename}")
async def download_report(filename: str):
    file_path = os.path.join(REPORTS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(file_path, filename=filename, media_type='application/pdf')

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
