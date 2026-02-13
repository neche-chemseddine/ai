# IntelliView AI - Phase 1 Core Engine

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

## Phase 1 Progress
- [x] Infrastructure Setup (Docker Config)
- [x] CV Parsing (FastAPI + PyMuPDF)
- [x] API Gateway (NestJS + TypeORM)
- [x] Database Schema (Tenants, Interviews, Messages)
- [x] WebSocket Chat (Socket.io)
