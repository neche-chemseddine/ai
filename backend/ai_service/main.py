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
    cv_summary: Optional[str] = None
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
        
        # Generate CV Summary for persistent context
        summary_prompt = f"<s>[INST] Summarize this CV in 3-4 bullet points focusing on technical stack and seniority. Limit to 100 words.\n\nCV TEXT:\n{text[:2000]} [/INST]"
        summary_output = llm(summary_prompt, max_tokens=200, stop=["</s>"], echo=False)
        cv_summary = summary_output["choices"][0]["text"].strip()

        return {
            "filename": file.filename,
            "cv_session_id": cv_session_id,
            "chunk_count": len(chunks),
            "cv_summary": cv_summary,
            "preview": chunks[:3]
        }
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error parsing CV: {str(e)}")

@app.post("/v1/chat/generate")
async def generate_response(request: ChatRequest):
    try:
        # 1. Determine Interview Phase based on history length
        history_len = len(request.history)
        if history_len < 2:
            phase = "VERIFICATION (Confirming CV facts)"
        elif history_len < 6:
            phase = "BREADTH (Scanning technical skills)"
        elif history_len < 12:
            phase = "DEPTH (Deep dive into complex projects)"
        else:
            phase = "SCENARIO (Problem solving & architecture)"

        # 2. Context Retrieval Strategy (Query Expansion)
        search_query = request.message
        if request.history:
            # Ask LLM to generate a search query for the vector DB based on history
            expansion_prompt = f"""<s>[INST] Based on the following conversation, generate a short (3-5 words) search query to find relevant technical details in the candidate's CV.
History:
{request.history[-2:]}
Latest: {request.message}
Query: [/INST]"""
            expansion_output = llm(expansion_prompt, max_tokens=20, stop=["\n"], echo=False)
            search_query = expansion_output["choices"][0]["text"].strip().strip('"')
            print(f"DEBUG: Expanded Search Query: {search_query}", flush=True)

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
            limit=5  # Increased from 3 to 5 for better context
        ).points
        
        context = "\n".join([f"- {hit.payload['text']}" for hit in search_result])
        
        # 3. System Prompt Construction
        cv_summary_text = f"\nCV SUMMARY (Holistic View):\n{request.cv_summary}" if request.cv_summary else ""
        system_prompt = f"""You are a Senior Principal Engineer conducting a strict technical interview.
Current Phase: {phase}

CORE RULES:
1. LEAD THE INTERVIEW. Ask exactly ONE sharp, technical question per turn.
2. PROBE DEEPER: If the candidate's answer is vague or short, do not move on. Ask "How" or "Why".
3. NO FLUFF: Be extremely concise (max 2 sentences). No "Great", "Excellent", or "I see".
4. REDIRECT: If the candidate is off-topic or asks you a question, firmly bring them back to your technical question.
5. NEVER reveal you are an AI. Never include meta-commentary or notes.
{cv_summary_text}

CV CONTEXT (Specific details for current turn):
{context}
"""

        # 4. Mistral-7B History Formatting (<s>[INST] Instruction [/INST] Model answer</s>[INST] Follow-up [/INST])
        if request.is_init:
            full_prompt = f"<s>[INST] {system_prompt}\n\nGreet the candidate and start the {phase} phase with one question. [/INST]"
        else:
            # Reconstruct history in Mistral format
            formatted_history = ""
            for i, msg in enumerate(request.history):
                role = msg.get("role")
                content = msg.get("content")
                if role == "user":
                    formatted_history += f"[INST] {content} [/INST] "
                else:
                    formatted_history += f"{content} </s><s>"
            
            # Remove trailing <s> if exists
            if formatted_history.endswith("<s>"):
                formatted_history = formatted_history[:-3]

            full_prompt = f"<s>[INST] {system_prompt} [/INST] {formatted_history} [INST] {request.message} [/INST]"

        print(f"DEBUG: Full Prompt Length: {len(full_prompt)}", flush=True)
        output = llm(full_prompt, max_tokens=150, stop=["[INST]", "</s>", "Note:", "Interviewer:"], echo=False)
        response_text = output["choices"][0]["text"].strip()
        
        # Final cleanup
        response_text = re.sub(r"\(?Note:.*", "", response_text, flags=re.IGNORECASE).strip()
        response_text = response_text.replace("Assistant:", "").replace("Interviewer:", "").strip()
        
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
        
        # 2. Ask LLM to evaluate with Chain-of-Thought (CoT)
        eval_prompt = f"""<s>[INST] You are an Elite Technical Bar-Raiser. Evaluate this technical interview transcript with extreme skepticism.

**STRICT CRITICAL RULES:**
1. ANALYZE FIRST: Before giving scores, write a short "Auditor Note" for each turn identifying if the candidate was vague, technically incorrect, or evasive.
2. PENALIZE HEAVILY:
   - Surface-level answers (buzzwords without "how/why") = Max 3/10.
   - Repeating information or dodging questions = 0/10 for that section.
   - Discrepancy between CV claims and interview performance = Flag as "High Risk".
3. EVIDENCE REQUIRED: For every strength and weakness, you MUST include a direct quote from the candidate.

TRANSCRIPT:
{transcript_text}

Output ONLY a valid JSON object in this format:
{{
    "auditor_notes": "Your internal critique of the candidate's honesty and depth...",
    "technical_score": int,
    "communication_score": int,
    "problem_solving_score": int,
    "experience_match_score": int,
    "strengths": ["Strength description [Quote from transcript]"],
    "weaknesses": ["Weakness description [Quote from transcript]"],
    "proven_skills": ["Skill name - Evidence level (Low/Med/High)"],
    "summary": "Realistic executive summary including hiring recommendation (Hire/No Hire)."
}}
[/INST]"""

        output = llm(eval_prompt, max_tokens=2048, stop=["</s>"], echo=False)
        eval_json_str = output["choices"][0]["text"].strip()
        print(f"DEBUG: Raw LLM Output: {eval_json_str}", flush=True)
        
        # Robust JSON extraction
        try:
            start_idx = eval_json_str.find('{')
            end_idx = eval_json_str.rfind('}')
            
            if start_idx != -1:
                json_str = eval_json_str[start_idx:end_idx+1]
                evaluation = json.loads(json_str)
            else:
                 raise ValueError("Could not find { in LLM output")
        except Exception as e:
            print(f"JSON Extraction Error: {e}. Raw: {eval_json_str}")
            evaluation = {
                "technical_score": 1,
                "communication_score": 1,
                "problem_solving_score": 1,
                "experience_match_score": 1,
                "strengths": ["N/A"],
                "weaknesses": ["Analysis failed: Transcript likely too short or incoherent."],
                "proven_skills": ["None detected"],
                "summary": "The evaluation failed due to insufficient data or LLM error."
            }

        # Enforce defaults and realistic overrides
        if len(request.transcript) < 4:
            evaluation["summary"] = "NO HIRE: Interview was too short to establish any technical signal."
            evaluation["technical_score"] = min(evaluation.get("technical_score", 1), 2)

        # 3. Generate PDF
        pdf = ReportPDF()
        pdf.add_page()
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 10, f"Candidate: {request.candidate_name}", 0, 1)
        
        # Score Grid
        pdf.set_font('Arial', 'B', 10)
        pdf.cell(45, 10, f"Technical: {evaluation.get('technical_score', 0)}/10", 1, 0)
        pdf.cell(45, 10, f"Comm: {evaluation.get('communication_score', 0)}/10", 1, 0)
        pdf.cell(45, 10, f"Problem: {evaluation.get('problem_solving_score', 0)}/10", 1, 0)
        pdf.cell(45, 10, f"Match: {evaluation.get('experience_match_score', 0)}/10", 1, 1)
        
        pdf.ln(5)
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(0, 10, "Auditor Review Notes:", 0, 1)
        pdf.set_font('Arial', 'I', 10)
        pdf.multi_cell(0, 6, evaluation.get('auditor_notes', 'N/A'))

        pdf.ln(5)
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(0, 10, "Executive Summary & Recommendation:", 0, 1)
        pdf.set_font('Arial', '', 11)
        pdf.multi_cell(0, 7, evaluation.get('summary', 'N/A'))
        
        pdf.ln(5)
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(0, 10, "Proven Technical Skills (Evidence-Based):", 0, 1)
        pdf.set_font('Arial', '', 10)
        for skill in evaluation.get('proven_skills', []):
            pdf.cell(0, 7, f"* {skill}", 0, 1)

        pdf.ln(5)
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(0, 10, "Key Strengths:", 0, 1)
        pdf.set_font('Arial', '', 10)
        for s in evaluation.get('strengths', []):
            pdf.multi_cell(0, 6, f"+ {s}")
            
        pdf.ln(5)
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(0, 10, "Critical Weaknesses:", 0, 1)
        pdf.set_font('Arial', '', 10)
        for w in evaluation.get('weaknesses', []):
            pdf.multi_cell(0, 6, f"- {w}")

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
