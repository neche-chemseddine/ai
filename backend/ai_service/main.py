from fastapi import FastAPI, UploadFile, File, HTTPException
import fitz  # PyMuPDF
import os
from qdrant_client import QdrantClient
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer
import uuid

app = FastAPI(title="IntelliView AI Service")

# Initialize models and client
# Use a small model for MVP Phase 1
embed_model = SentenceTransformer('all-MiniLM-L6-v2')
qdrant_host = os.getenv("QDRANT_HOST", "localhost")
qdrant_client = QdrantClient(host=qdrant_host, port=6333)

COLLECTION_NAME = "cv_chunks"

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
        
        # Basic chunking logic
        chunks = [c.strip() for c in text.split("\n\n") if c.strip()]
        
        # Generate ID for this CV session
        cv_session_id = str(uuid.uuid4())
        
        # Embed and store chunks in Qdrant
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
