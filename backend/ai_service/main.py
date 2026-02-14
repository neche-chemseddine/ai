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
llm = Llama(model_path=MODEL_PATH, n_ctx=4096, n_threads=4)
print("LLM Loaded.")

COLLECTION_NAME = "cv_chunks"
REPORTS_DIR = "/home/chems/.gemini/tmp/reports"
os.makedirs(REPORTS_DIR, exist_ok=True)

class ChatRequest(BaseModel):
    cv_session_id: str
    message: str
    history: List[dict] = []
    is_init: bool = False

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
        # Context Retrieval Strategy
        # If we have history, use the last AI question + current user message for better context
        search_query = request.message
        if request.history and len(request.history) > 0:
            last_msg = request.history[-1]
            if last_msg.get("role") == "assistant":
                content = last_msg.get("content")
                if content:
                     search_query = f"{content} {request.message}"
        
        print(f"DEBUG: Search Query: {search_query}", flush=True)

        query_vector = embed_model.encode(search_query).tolist()
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
        
        if request.is_init:
            system_prompt = f"""You are a strict technical interviewer. 
Greet the candidate and ask ONE specific technical question from their CV context.
Be brief (max 2 sentences).
DO NOT include any notes, thoughts, or meta-commentary.

CV CONTEXT:
{context}
"""
            full_prompt = f"<s>[INST] {system_prompt} [/INST]"
        else:
            system_prompt = f"""You are a strict technical interviewer. 

Rules:
1. You are leading the interview. DO NOT answer any questions asked by the candidate.
2. If the candidate asks a question, refuses to answer, or is off-topic, firmly redirect them to your original question.
3. Ask exactly ONE question per turn.
4. Do not repeat questions you have already asked in the history.
5. Be extremely concise (1-2 sentences).
6. NEVER include meta-commentary like "Note:", "(Note: ...)", or explanations about your rules.

CV CONTEXT:
{context}
"""
            # Build history string
            conversation_history = ""
            if request.history:
                for msg in request.history:
                    role = msg.get("role")
                    content = msg.get("content")
                    if role == "assistant":
                        conversation_history += f"{content} </s>"
                    elif role == "user":
                        conversation_history += f"<s>[INST] {content} [/INST]"
            
            # Construct full prompt with history
            full_prompt = f"<s>[INST] {system_prompt} [/INST] {conversation_history} <s>[INST] {request.message} [/INST]"
        
        print(f"DEBUG: Full Prompt Length: {len(full_prompt)}", flush=True)
        output = llm(full_prompt, max_tokens=128, stop=["[INST]", "</s>", "Note:", "("], echo=False)
        response_text = output["choices"][0]["text"].strip()
        
        # Post-processing to remove any accidental leakage if LLM ignores 'stop'
        response_text = re.sub(r"\(?Note:.*", "", response_text, flags=re.IGNORECASE).strip()
        
        return {"response": response_text}
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error in generate_response: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/report/generate")
async def generate_report(request: EvaluationRequest):
    try:
        # 1. Prepare Transcript for LLM
        transcript_text = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in request.transcript])
        
        # 2. Ask LLM to evaluate
        eval_prompt = f"""<s>[INST] Evaluate this technical interview transcript. Return ONLY a JSON object.

**STRICT Evaluation Rules:**
1. Be extremely critical. 
2. If the candidate repeated the same answer or information, penalize heavily in all scores.
3. If the candidate asked questions back to the interviewer instead of answering, give a 0 for technical and problem solving scores for those turns.
4. If the candidate used generic/vague buzzwords without explaining 'how' or 'why', give low technical scores (1-3).
5. High scores (8-10) require specific, unique technical details for EVERY answer.
6. Evaluate ONLY what is demonstrated in the TRANSCRIPT, not what is in the CV.

TRANSCRIPT:
{transcript_text}

JSON Format:
{{
    "technical_score": int,
    "communication_score": int,
    "problem_solving_score": int,
    "experience_match_score": int,
    "strengths": ["..."],
    "weaknesses": ["..."],
    "summary": "..."
}}
[/INST]"""

        output = llm(eval_prompt, max_tokens=1536, stop=["</s>"], echo=False)
        eval_json_str = output["choices"][0]["text"].strip()
        print(f"DEBUG: Raw LLM Output: {eval_json_str}", flush=True)
        
        # Robust JSON extraction
        try:
            start_idx = eval_json_str.find('{')
            end_idx = eval_json_str.rfind('}')
            
            if start_idx != -1:
                if end_idx == -1 or end_idx < start_idx:
                    # Try to close it if it's truncated
                    json_str = eval_json_str[start_idx:] + '\n"}"' 
                    # This is a bit hacky, better to just try parsing what we have or fix common issues
                else:
                    json_str = eval_json_str[start_idx:end_idx+1]
                
                # Attempt to parse
                try:
                    evaluation = json.loads(json_str)
                except json.JSONDecodeError:
                    # If it failed, maybe it's missing the closing brace
                    if not json_str.strip().endswith('}'):
                        try:
                            evaluation = json.loads(json_str + '}')
                        except:
                            # Try one more: close any open strings and then the object
                            try:
                                evaluation = json.loads(json_str + '"] }')
                            except:
                                raise ValueError("JSON truncated beyond simple repair")
                    else:
                        raise
            else:
                 raise ValueError("Could not find { in LLM output")
        except Exception as e:
            print(f"JSON Extraction Error: {e}. Raw: {eval_json_str}")
            # Fallback to a failure evaluation instead of 500
            evaluation = {
                "technical_score": 1,
                "communication_score": 1,
                "problem_solving_score": 1,
                "experience_match_score": 1,
                "strengths": ["N/A"],
                "weaknesses": ["System failed to parse evaluation"],
                "summary": "The evaluation could not be parsed due to an LLM output error."
            }


        # Enforce defaults for all required fields
        evaluation.setdefault('technical_score', 1)
        evaluation.setdefault('communication_score', 1)
        evaluation.setdefault('problem_solving_score', 1)
        evaluation.setdefault('experience_match_score', 1)
        evaluation.setdefault('strengths', ["Insufficient data"])
        evaluation.setdefault('weaknesses', ["Candidate provided insufficient or vague responses."])
        evaluation.setdefault('summary', "The interview was too short or vague to provide a meaningful evaluation.")

        # 3. Generate PDF
        pdf = ReportPDF()
        pdf.add_page()
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 10, f"Candidate: {request.candidate_name}", 0, 1)
        
        # Score Grid
        pdf.set_font('Arial', 'B', 10)
        pdf.cell(90, 10, f"Technical Depth: {evaluation['technical_score']}/10", 1, 0)
        pdf.cell(90, 10, f"Communication: {evaluation['communication_score']}/10", 1, 1)
        pdf.cell(90, 10, f"Problem Solving: {evaluation['problem_solving_score']}/10", 1, 0)
        pdf.cell(90, 10, f"Experience Match: {evaluation['experience_match_score']}/10", 1, 1)
        
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
