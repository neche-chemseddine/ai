from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import fitz  # PyMuPDF
import os
from qdrant_client import QdrantClient
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer
import uuid
from typing import List, Optional
from fpdf import FPDF
import json
import re
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="IntelliView AI Service")

# LLM Configuration
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq").lower()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Initialize models and client
embed_model = SentenceTransformer('all-MiniLM-L6-v2')
qdrant_host = os.getenv("QDRANT_HOST", "localhost")
qdrant_client = QdrantClient(host=qdrant_host, port=6333)

llm = None

def get_llm():
    global llm
    if llm is not None:
        return llm

    if LLM_PROVIDER == "local":
        from llama_cpp import Llama
        from huggingface_hub import hf_hub_download
        print("Loading Local LLM (Mistral)...")
        MODEL_PATH = hf_hub_download(
            repo_id="TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
            filename="mistral-7b-instruct-v0.2.Q4_K_M.gguf"
        )
        llm = Llama(model_path=MODEL_PATH, n_ctx=4096, n_threads=4)
        print("Local LLM Loaded.")
    else:
        print("Using Groq API.")
        if not GROQ_API_KEY:
            print("WARNING: GROQ_API_KEY not set!")
        llm = Groq(api_key=GROQ_API_KEY)
    return llm

def call_llm(prompt, max_tokens=500, stop=None):
    client = get_llm()
    if LLM_PROVIDER == "local":
        output = client(prompt, max_tokens=max_tokens, stop=stop, echo=False)
        return output["choices"][0]["text"].strip()
    else:
        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model="llama-3.3-70b-versatile",
                max_tokens=max_tokens,
                stop=stop,
            )
            return chat_completion.choices[0].message.content.strip()
        except Exception as e:
            print(f"DEBUG: Groq call failed: {e}")
            return f"Error calling Groq: {str(e)}"

COLLECTION_NAME = "cv_chunks"
REPORTS_DIR = "/home/chems/.gemini/tmp/reports"
os.makedirs(REPORTS_DIR, exist_ok=True)

class ChatRequest(BaseModel):
    cv_session_id: str
    message: str
    cv_summary: Optional[str] = None
    history: List[dict] = []
    is_init: bool = False

class QuizRequest(BaseModel):
    cv_session_id: str
    cv_summary: str
    num_questions: int = 5

class ChallengeRequest(BaseModel):
    cv_session_id: str
    cv_summary: str
    language: Optional[str] = "python"

class QuizEvaluationRequest(BaseModel):
    quiz_data: List[dict]
    candidate_answers: dict

class CodingEvaluationRequest(BaseModel):
    problem_statement: str
    solution: str
    test_results: Optional[dict] = None

class EvaluationRequest(BaseModel):
    candidate_name: str
    transcript: List[dict]
    cv_session_id: str
    quiz_results: Optional[dict] = None
    coding_solution: Optional[str] = None
    coding_results: Optional[dict] = None

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

@app.post("/v1/quiz/generate")
async def generate_quiz(request: QuizRequest):
    try:
        prompt = f"""[INST] You are an Expert Principal Engineer conducting a high-stakes technical assessment. Generate {request.num_questions} deeply technical multiple-choice questions (MCQs).
Target Tech Stack: {request.cv_summary}

RULES:
1. FOCUS ON DEPTH: Do not ask surface-level "What is..." questions. Focus on:
   - Language Internals (e.g., Python's GIL, Memory Management, Async loop internals).
   - Architectural Trade-offs (e.g., CAP Theorem, Distributed Consistency).
   - Performance & Optimization (e.g., Time complexity of specific library operations, Database indexing internals).
2. SERIOUS TONE: The questions must be challenging enough that only a Senior+ Engineer would answer all correctly.
3. 4 OPTIONS: Provide exactly 4 options. Options must be plausible (no obvious "wrong" answers).
4. SENIORITY MATCH: Ensure the complexity aligns with a "Bar-Raiser" standard.

Output ONLY a valid JSON array:
[
  {{
    "id": 1,
    "question": "Deep technical question...",
    "options": ["Plausible Opt A", "Plausible Opt B", "Plausible Opt C", "Plausible Opt D"],
    "correct_answer": index_int,
    "explanation": "Detailed technical explanation of why the answer is correct and why others are subtlely wrong."
  }}
]
[/INST]"""
        
        quiz_json_str = call_llm(prompt, max_tokens=2048, stop=["</s>"])
        
        # Robust JSON extraction
        start_idx = quiz_json_str.find('[')
        end_idx = quiz_json_str.rfind(']')
        if start_idx != -1:
            json_str = quiz_json_str[start_idx:end_idx+1]
            json_str = "".join(ch for ch in json_str if ch.isprintable() or ch in "\n\r\t")
            quiz = json.loads(json_str, strict=False)
            return {"quiz": quiz}
        else:
            raise ValueError("Could not find [ in LLM output")
            
    except Exception as e:
        print(f"Error generating quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/coding/generate")
async def generate_challenge(request: ChallengeRequest):
    try:
        prompt = f"""[INST] Generate a coding challenge for a candidate with the following CV summary.
Language: {request.language}
The challenge should be of appropriate difficulty for their seniority.

CV SUMMARY:
{request.cv_summary}

Output ONLY a valid JSON object with this format:
{{
  "title": "Challenge Title",
  "problem_statement": "Markdown description of the problem...",
  "template": "Initial code for the candidate...",
  "expected_output_type": "string/int/list",
  "test_cases": [
    {{"input": "args", "output": "expected result"}}
  ]
}}
[/INST]"""
        
        challenge_json_str = call_llm(prompt, max_tokens=2048, stop=["</s>"])
        
        start_idx = challenge_json_str.find('{')
        end_idx = challenge_json_str.rfind('}')
        if start_idx != -1:
            json_str = challenge_json_str[start_idx:end_idx+1]
            # Remove non-printable control characters except newline and tab
            json_str = "".join(ch for ch in json_str if ch.isprintable() or ch in "\n\r\t")
            challenge = json.loads(json_str, strict=False)
            return challenge
        else:
            raise ValueError("Could not find { in LLM output")
            
    except Exception as e:
        print(f"Error generating challenge: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/quiz/evaluate")
async def evaluate_quiz(request: QuizEvaluationRequest):
    try:
        correct_count = 0
        total = len(request.quiz_data)
        breakdown = []
        
        for i, q in enumerate(request.quiz_data):
            candidate_ans = request.candidate_answers.get(str(i))
            is_correct = candidate_ans == q['correct_answer']
            if is_correct:
                correct_count += 1
            breakdown.append({
                "question": q['question'],
                "is_correct": is_correct,
                "candidate_answer": candidate_ans,
                "correct_answer": q['correct_answer']
            })
            
        score = (correct_count / total) * 10
        
        prompt = f"""[INST] Analyze this candidate's quiz performance for a Senior role.
Score: {score}/10 ({correct_count}/{total} correct).
Breakdown: {json.dumps(breakdown)}

Provide a concise (2 sentence) professional critique of their theoretical knowledge base. 
Be direct and serious. [/INST]"""
        
        critique = call_llm(prompt, max_tokens=100)
        
        return {
            "score": score,
            "correct_count": correct_count,
            "total": total,
            "critique": critique
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/coding/evaluate")
async def evaluate_coding(request: CodingEvaluationRequest):
    try:
        prompt = f"""[INST] You are a Senior Principal Engineer performing a code review. 
Problem: {request.problem_statement}
Candidate Solution:
{request.solution}

Analyze for:
1. Time/Space Complexity.
2. Idiomatic usage & Code Quality.
3. Edge case handling.

Output ONLY a JSON object:
{{
  "score": int (1-10),
  "complexity": "e.g. O(N log N)",
  "critique": "Serious, direct technical feedback...",
  "missing_elements": ["List of missed edge cases or optimizations"]
}}
[/INST]"""
        
        eval_json_str = call_llm(prompt, max_tokens=1000)
        start_idx = eval_json_str.find('{')
        end_idx = eval_json_str.rfind('}')
        if start_idx != -1:
            json_str = eval_json_str[start_idx:end_idx+1]
            json_str = "".join(ch for ch in json_str if ch.isprintable() or ch in "\n\r\t")
            evaluation = json.loads(json_str, strict=False)
            return evaluation
        else:
            raise ValueError("Evaluation failed")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        summary_prompt = f"[INST] Summarize this CV in 3-4 bullet points focusing on technical stack and seniority. Limit to 100 words.\n\nCV TEXT:\n{text[:2000]} [/INST]"
        cv_summary = call_llm(summary_prompt, max_tokens=200, stop=["</s>"])

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
            expansion_prompt = f"""[INST] Based on the following conversation, generate a short (3-5 words) search query to find relevant technical details in the candidate's CV.
History:
{request.history[-2:]}
Latest: {request.message}
Query: [/INST]"""
            search_query = call_llm(expansion_prompt, max_tokens=20, stop=["\n"]).strip().strip('"')
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
        system_prompt = f"""You are a Senior Principal Engineer conducting a professional but rigorous technical interview.
Current Phase: {phase}

CORE RULES:
1. LEAD THE INTERVIEW. Ask exactly ONE sharp, technical question per turn.
2. PROBE FOR DEPTH: If the candidate provides a good answer, ask a more advanced follow-up to find their limit. If vague, ask "How" or "Why".
3. NO FLUFF: Be concise (max 3 sentences). Avoid generic praise like "Great" or "Excellent" unless they provide an exceptionally deep answer.
4. REDIRECT: If the candidate is off-topic or evasive, firmly but professionally bring them back to the technical core.
5. NEVER reveal you are an AI. Never include meta-commentary.
{cv_summary_text}

CV CONTEXT (Specific details for current turn):
{context}
"""

        # 4. Mistral-7B History Formatting ([INST] Instruction [/INST] Model answer</s>[INST] Follow-up [/INST])
        if request.is_init:
            full_prompt = f"[INST] {system_prompt}\n\nGreet the candidate and start the {phase} phase with one question. [/INST]"
        else:
            # Reconstruct history in Mistral format
            formatted_history = ""
            for i, msg in enumerate(request.history):
                role = msg.get("role")
                content = msg.get("content")
                if role == "user":
                    formatted_history += f"[INST] {content} [/INST] "
                else:
                    formatted_history += f"{content} </s>"
            
            full_prompt = f"[INST] {system_prompt} [/INST] {formatted_history} [INST] {request.message} [/INST]"

        print(f"DEBUG: Full Prompt Length: {len(full_prompt)}", flush=True)
        response_text = call_llm(full_prompt, max_tokens=150, stop=["[INST]", "</s>", "Note:", "Interviewer:"])
        
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
        
        quiz_info = ""
        if request.quiz_results:
            quiz_info = f"\nQUIZ RESULTS: {json.dumps(request.quiz_results)}"
            
        coding_info = ""
        if request.coding_solution:
            coding_info = f"\nCODING SOLUTION:\n{request.coding_solution}\nCODING RESULTS: {json.dumps(request.coding_results)}"

        # 2. Ask LLM to evaluate with Chain-of-Thought (CoT)
        eval_prompt = f"""[INST] You are an Expert Technical Bar-Raiser. Evaluate this technical assessment to determine if the candidate meets the high standards for a Senior Engineer.

ASSESSMENT DATA:{quiz_info}{coding_info}

TRANSCRIPT:
{transcript_text}

**SCORING CRITERIA:**
- PERFECT (9-10/10): Deep technical expertise, provides specific implementation details (tools, metrics, trade-offs), and handles advanced follow-ups with ease.
- STRONG (7-8/10): Clear understanding of concepts, provides good examples, and is technically sound.
- WEAK/VAGUE (3-6/10): Uses buzzwords but cannot explain "how" or "why". Dodges questions or provides surface-level answers.
- NO SIGNAL (0-2/10): Off-topic, minimalist (one-word answers), or technically incorrect.

**STRICT RULES:**
1. ANALYZE FIRST: Write a short "Auditor Note" evaluating the technical depth.
2. REWARD EXPERTISE: Candidates who mention specific tools (pg_stat_statements, asyncpg, Envoy, gRPC, Pydantic), specific configs (work_mem, pool_size), or specific metrics are EXPERTS. These are not "buzzwords" when used to explain a solution—they are evidence of mastery.
3. BE FAIR TO DEPTH: If a candidate provides a highly technical answer, they should be scored 8-10. Even if they pivot slightly to provide broader context (Technical Chaining), this is a sign of SENIORITY and should be REWARDED, not penalized.
4. HIRE RECOMMENDATION: 
   - HIRE: Required for any candidate with Technical Score >= 7.
   - NO HIRE: Reserved for Vague, Off-topic, or Minimalist candidates.
5. FINAL RECOMMENDATION: Clear "HIRE" for Perfect/Strong; "NO HIRE" for others.

Output ONLY a valid JSON object in this format:
{{
    "auditor_notes": "Critique of depth, honesty, and technical accuracy...",
    "technical_score": int,
    "communication_score": int,
    "problem_solving_score": int,
    "experience_match_score": int,
    "strengths": ["Strength [Quote]"],
    "weaknesses": ["Weakness [Quote]"],
    "proven_skills": ["Skill - Evidence Level (Low/Med/High)"],
    "summary": "Clear HIRE or NO HIRE recommendation with justification."
}}
[/INST]"""

        eval_json_str = call_llm(eval_prompt, max_tokens=2048, stop=["</s>"])
        print(f"DEBUG: Raw LLM Output: {eval_json_str}", flush=True)
        
        # Robust JSON extraction
        try:
            start_idx = eval_json_str.find('{')
            end_idx = eval_json_str.rfind('}')
            
            if start_idx != -1:
                json_str = eval_json_str[start_idx:end_idx+1]
                json_str = "".join(ch for ch in json_str if ch.isprintable() or ch in "\n\r\t")
                evaluation = json.loads(json_str, strict=False)
            else:
                 raise ValueError("Could not find { in LLM output")
        except Exception as e:
            print(f"JSON Extraction Error: {e}. Raw: {eval_json_str}")
            evaluation = {}

        # Enforce defaults and realistic overrides
        evaluation.setdefault('technical_score', 1)
        evaluation.setdefault('communication_score', 1)
        evaluation.setdefault('problem_solving_score', 1)
        evaluation.setdefault('experience_match_score', 1)
        evaluation.setdefault('auditor_notes', 'N/A')
        evaluation.setdefault('summary', 'The evaluation failed due to insufficient data or LLM error.')
        evaluation.setdefault('strengths', ['N/A'])
        evaluation.setdefault('weaknesses', ['Analysis failed: Transcript likely too short or incoherent.'])
        evaluation.setdefault('proven_skills', ['None detected'])

        if len(request.transcript) < 4:
            evaluation["summary"] = "NO HIRE: Interview was too short to establish any technical signal."
            evaluation["technical_score"] = min(evaluation.get("technical_score", 1), 2)

        # 3. Generate PDF
        pdf = ReportPDF()
        pdf.add_page()
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(pdf.epw, 10, f"Candidate: {request.candidate_name}", 0, 1)
        
        # Score Grid
        pdf.set_font('Arial', 'B', 10)
        col_width = pdf.epw / 4
        pdf.cell(col_width, 10, f"Technical: {evaluation['technical_score']}/10", 1, 0)
        pdf.cell(col_width, 10, f"Comm: {evaluation['communication_score']}/10", 1, 0)
        pdf.cell(col_width, 10, f"Problem: {evaluation['problem_solving_score']}/10", 1, 0)
        pdf.cell(col_width, 10, f"Match: {evaluation['experience_match_score']}/10", 1, 1)
        
        pdf.ln(5)
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(pdf.epw, 10, "Auditor Review Notes:", 0, 1)
        pdf.set_font('Arial', 'I', 10)
        pdf.multi_cell(pdf.epw, 6, evaluation['auditor_notes'])

        pdf.ln(5)
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(pdf.epw, 10, "Executive Summary & Recommendation:", 0, 1)
        pdf.set_font('Arial', '', 11)
        pdf.multi_cell(pdf.epw, 7, evaluation['summary'])
        
        pdf.ln(5)
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(pdf.epw, 10, "Proven Technical Skills (Evidence-Based):", 0, 1)
        pdf.set_font('Arial', '', 10)
        for skill in evaluation['proven_skills']:
            pdf.cell(pdf.epw, 7, f"* {skill}", 0, 1)

        pdf.ln(5)
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(pdf.epw, 10, "Key Strengths:", 0, 1)
        pdf.set_font('Arial', '', 10)
        for s in evaluation['strengths']:
            pdf.multi_cell(pdf.epw, 6, f"+ {s}")
            
        pdf.ln(5)
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(pdf.epw, 10, "Critical Weaknesses:", 0, 1)
        pdf.set_font('Arial', '', 10)
        for w in evaluation['weaknesses']:
            pdf.multi_cell(pdf.epw, 6, f"- {w}")

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
