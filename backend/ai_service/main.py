from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import fitz  # PyMuPDF
import os
from qdrant_client import QdrantClient
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer
from llama_cpp import Llama
from huggingface_hub import hf_hub_download
import uuid
from typing import List

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

class ChatRequest(BaseModel):
    cv_session_id: str
    message: str
    history: List[dict] = []

# Ensure collection exists
try:
    qdrant_client.get_collection(COLLECTION_NAME)
except Exception:
    qdrant_client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE),
    )

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
        print(f"Generating response for CV session: {request.cv_session_id}")
        # 1. Retrieve context from Qdrant
        query_vector = embed_model.encode(request.message).tolist()
        
        # Using query_points (modern API) instead of search
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
        print(f"Retrieved {len(search_result)} chunks for context.")
        
        # 2. Build prompt
        system_prompt = f"""You are an expert technical interviewer. 
Use the following CV context to interview the candidate. 
Be professional, concise, and ask relevant technical questions.

CV CONTEXT:
{context}
"""
        full_prompt = f"<s>[INST] {system_prompt}\n\nCandidate: {request.message} [/INST]"
        
        # 3. Generate response
        print("Generating LLM response...")
        output = llm(
            full_prompt,
            max_tokens=256,
            stop=["[INST]", "</s>"],
            echo=False
        )
        
        response_text = output["choices"][0]["text"].strip()
        print("Response generated.")
        
        return {"response": response_text}
    except Exception as e:
        print(f"Error in generate: {e}")
        # Log more details about the client if it fails again
        print(f"Client type: {type(qdrant_client)}")
        print(f"Client dir: {dir(qdrant_client)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
