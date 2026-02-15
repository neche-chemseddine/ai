# IntelliView AI - Core Workflows

This document details the technical workflows for the IntelliView AI platform, covering Phase 1 (Core Engine) functionality.

---

## 1. CV Ingestion & Processing Workflow
When a candidate uploads a CV, the system performs the following steps:

```mermaid
sequenceDiagram
    participant C as Candidate Browser
    participant G as API Gateway (NestJS)
    participant A as AI Service (FastAPI)
    participant Q as Qdrant (Vector DB)
    participant D as PostgreSQL

    C->>G: POST /v1/interviews/upload (PDF)
    G->>A: Forward PDF
    A->>A: Extract Text (PyMuPDF)
    A->>A: Chunk Text
    A->>A: Generate Embeddings (MiniLM)
    A->>Q: Store Vectors + Metadata (cv_session_id)
    A-->>G: Return cv_session_id + Chunk Count
    G->>D: Create Interview Record (Save Session ID)
    G-->>C: Return interviewId
```

1.  **Frontend**: User selects a PDF and clicks "Start Interview".
2.  **API Gateway**: Receives the file via `POST /api/v1/interviews/upload`.
3.  **AI Service**: 
    *   Extracts raw text from the PDF using `PyMuPDF`.
    *   Splits text into logical chunks.
    *   Generates 384-dimensional embeddings for each chunk using `all-MiniLM-L6-v2`.
    *   Stores chunks in **Qdrant** with a `cv_session_id` metadata filter.
4.  **Database**: Gateway creates an `Interview` record and stores the `cv_session_id` in the `rubric` field.

---

## 2. RAG-Based Interview Chat Workflow
The interview interaction is powered by Retrieval-Augmented Generation (RAG) to ensure the AI remains grounded in the candidate's actual experience.

```mermaid
graph TD
    User((Candidate)) -- 1. Connects --> UI[Show Start Screen]
    UI -- 2. Clicks Start --> Gateway[API Gateway]
    Gateway -- 3. Request Init --> AI[AI Service]
    AI -- 4. Return Opener --> Gateway
    Gateway -- 5. interviewer_message --> User
    User -- 6. candidate_message --> Gateway
    Gateway -- 7. Save & Request Generate --> AI
    
    subgraph RAG Cycle
        AI -- 8. Embed Context --> Qdrant[(Qdrant)]
        AI -- 9. Prompt + Context --> LLM[Mistral-7B]
    end
    
    LLM -- 10. Response --> AI
    AI -- 11. Return Text --> Gateway
    Gateway -- 12. interviewer_message --> User
```

1.  **Session Initiation**:
    *   Candidate opens the unique link and connects via WebSockets.
    *   UI displays a welcoming interface with a **"Start Interview"** button.
    *   When clicked, the client emits `start_interview`.
    *   **Gateway**: Triggers an "Initialization" call to the AI Service.
    *   **AI Service**: Generates a personalized greeting and the first technical question based on CV context.
    *   **User**: Receives the first message and the input field is enabled.
2.  **Standard Interaction**:
    *   The user sends a message via WebSockets (`candidate_message`).
    *   Gateway persists the message and increments progress counter.
3.  **AI Service (RAG)**:
    *   **Retrieval**: Embeds the candidate's latest message and searches **Qdrant** for relevant context.
    *   **Generation**: LLM generates a response constrained to one question at a time.
4.  **Auto-Closure**: Once the question limit is reached, the Gateway triggers the Evaluation pipeline and notifies the user.

---

## 3. Local Development Workflow
The project is containerized but optimized for local speed.

### Initial Setup
```bash
make install    # Install local dependencies for IDE support
make docker-up # Build and start the full stack
```

### Hot-Reloading
*   **AI Service**: Mounted as a volume in Docker. Changes to `backend/ai_service/*.py` trigger an automatic reload of the FastAPI server.
*   **API Gateway**: Mounted as a volume. NestJS runs in watch mode (`npm run start:dev`).
*   **Frontend**: Mounted as a volume. Vite provides Instant HMR (Hot Module Replacement).

### LLM Cache
The Mistral model is downloaded from Hugging Face on the first run. 
*Note: We recommend adding a volume for `~/.cache/huggingface` in docker-compose for persistence across `docker compose down` cycles.*
