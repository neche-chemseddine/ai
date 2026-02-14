# Technical Specification: IntelliView AI

## 1. Tech Stack
*   **Frontend:** React 18, TypeScript, Tailwind CSS, Vite.
*   **API Gateway/Orchestration:** Node.js (NestJS) - handles Auth, DB CRUD, and WebSocket management.
*   **AI Service:** Python (FastAPI) - interfaces with the LLM via `vLLM` or `Ollama`, handles RAG logic, and performs PDF parsing (using `PyMuPDF` or `pdfplumber`).
*   **Database:** PostgreSQL (Primary), Redis (Pub/Sub for WebSockets & Caching).
*   **Vector DB:** Qdrant (for storing CV embeddings to provide context to the LLM).
*   **LLM:** Mistral-7B-v0.3 (Chat), Mixtral-8x7B (Evaluation), BGE-Small-en (Embeddings).

## 2. System Architecture
```ascii
[Candidate Browser] <---WS---> [Node.js Gateway] <---gRPC/HTTP---> [Python AI Service]
                                     |                                   |
[Recruiter Dashboard] <---REST--> [PostgreSQL]                     [vLLM / LLM Farm]
                                     |                                   |
                                [Object Storage] <------------------ [Qdrant Vector DB]
                                  (CVs/Reports)
```

## 3. Database Schema (Simplified)
```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY,
    name TEXT,
    created_at TIMESTAMP
);

CREATE TABLE interviews (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    candidate_name TEXT,
    cv_url TEXT,
    status TEXT, -- pending, active, completed
    question_count INTEGER DEFAULT 0,
    rubric JSONB,
    report_url TEXT
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    interview_id UUID REFERENCES interviews(id),
    role TEXT, -- 'assistant' or 'user'
    content TEXT,
    created_at TIMESTAMP
);
```

## 4. API Endpoints (REST)
*   `POST /api/v1/interviews/upload`: Upload CV and initialize session.
*   `GET /api/v1/interviews/:id`: Get interview metadata.
*   `GET /api/v1/reports/:interview_id`: Fetch generated evaluation.

## 5. WebSocket Design (Interview Session)
*   **EVENT: candidate_message**: Sent by client when candidate submits answer.
*   **EVENT: start_interview**: Sent by client when candidate clicks "Start Interview".
*   **EVENT: interviewer_typing**: Sent by server to show activity.
*   **EVENT: interviewer_message**: The LLM-generated response.
*   **EVENT: session_completed**: Emitted when the question limit is reached.
*   **Logic Flow:**
    1.  **Preparation:** Candidate connects to WebSocket (no automated message).
    2.  **Trigger:** Candidate emits `start_interview`.
    3.  **Initiation:** Gateway calls AI Service with `is_init: true`, saves the response, and emits the first message.
    4.  **Standard Loop:** Gateway receives `candidate_message` and increments `question_count`.
    5.  **Turn-Taking:** If `count < limit`, requests next question from AI Service.
    6.  **Termination:** If `count == limit`, requests a concluding message and triggers Report Generation.

## 6. CV Processing Pipeline
1.  **Extract:** Python service extracts text from PDF using `PyMuPDF`.
2.  **Chunk:** Python service chunks text into logical sections (Experience, Skills).
3.  **Embed:** Generate vectors for each chunk.
4.  **Store:** Save to Qdrant with `interview_id` as a metadata filter.

## 7. Security & Scalability
*   **Data Isolation:** Row Level Security (RLS) in PostgreSQL based on `tenant_id`.
*   **Rate Limiting:** Redis-based sliding window rate limiter (10 req/sec for API, 1 message/5sec for Chat).
*   **Observability:** Prometheus for metrics (LLM tokens/sec), ELK stack for logging.
