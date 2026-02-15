# IntelliView AI - Intelligent Technical Interview Platform

## Project Structure
- `backend/gateway`: NestJS API Gateway (Node.js)
- `backend/ai_service`: FastAPI AI Service (Python)
- `frontend`: React/TypeScript/Vite (Frontend)

## Prerequisites
- Node.js & npm
- Python 3.9+
- Docker & Docker Compose (optional, for DB/Redis/Qdrant)

## Setup & Running

### 1. Infrastructure (Optional if you have Docker)
```bash
docker-compose up -d
```

### 2. AI Service (Python)
```bash
cd backend/ai_service
pip install -r requirements.txt
python main.py
```

### 3. API Gateway (NestJS)
```bash
cd backend/gateway
npm install
npm run start:dev
```

### 4. Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

## Documentation
- [Technical Specification](technical_specification.md)
- [MVP Plan](mvp_plan.md)
- [Core Workflows](WORKFLOWS.md)
- [Quality Audit Report](AI_QUALITY_REPORT.md)
- [MVP Improvement Proposal](mvp_improvement_proposal.md)

## Roadmap Progress

### Phase 1: Core Engine (Complete)
- [x] Infrastructure Setup (Postgres, Redis, Qdrant)
- [x] CV Parsing & Vector Indexing (FastAPI + PyMuPDF)
- [x] API Gateway Orchestration (NestJS)
- [x] WebSocket Real-time Chat Implementation

### Phase 2: Recruiter Experience (Complete)
- [x] Multi-tenant Auth Management
- [x] Interview Session Lifecycle (Link generation, expiry)
- [x] Automated Report Pipeline (PDF Generation)
- [x] Dashboard UI for Interview Management

### Phase 3: AI Intelligence & Criticality (Advanced Refinement)
- [x] **Phase-Aware Orchestration**: Structured progression (Verification -> Breadth -> Depth -> Scenario).
- [x] **Intelligent Context**: LLM-based RAG query expansion and holistic CV summary injection.
- [x] **Brutal Evaluator persona**: Skeptical, bar-raising analysis using Chain-of-Thought (CoT).
- [x] **Evidence-Based Scoring**: Mandatory transcript quotes for all strengths and weaknesses.
- [x] **Proven Skills Mapping**: Explicit detection of technical skills with evidence-based seniority levels.
- [ ] Load Testing (Target: 100 concurrent sessions)
- [ ] Public Beta Release
