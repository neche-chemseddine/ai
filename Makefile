# IntelliView AI - Development Makefile

.PHONY: install run-all run-ai run-gw run-fe docker-up docker-down docker-reset test-e2e help

# Colors for help message
BLUE := \033[34m
NC := \033[0m

help:
	@echo "Usage:"
	@echo "  make ${BLUE}install${NC}     - Install dependencies locally"
	@echo "  make ${BLUE}run-all${NC}     - Run all services locally (parallel)"
	@echo "  make ${BLUE}docker-up${NC}   - Start everything in Docker"
	@echo "  make ${BLUE}docker-down${NC} - Stop Docker containers"
	@echo "  make ${BLUE}docker-reset${NC}- Reset database (wipes volumes) and rebuild"
	@echo "  make ${BLUE}test-e2e${NC}    - Start Docker and run full E2E integration test"

install:
	@echo "Installing dependencies..."
	cd backend/ai_service && pip install -r requirements.txt
	cd backend/gateway && npm install
	cd frontend && npm install
	npm install

run-ai:
	cd backend/ai_service && python main.py

run-gw:
	cd backend/gateway && npm run start:dev

run-fe:
	cd frontend && npm run dev

run-all:
	@echo "Starting all services locally..."
	@$(MAKE) -j 3 run-ai run-gw run-fe

docker-up:
	@echo "Starting Docker containers..."
	docker compose up -d

docker-down:
	@echo "Stopping Docker containers..."
	docker compose down

docker-reset:
	@echo "Resetting Docker environment (wiping volumes)..."
	docker compose down -v
	docker compose up -d --build

test-e2e:
	@echo "Starting Docker environment for E2E..."
	docker compose up -d
	@echo "Waiting for Gateway to be ready (health check)..."
	@until curl -s http://localhost:3000/ > /dev/null; do sleep 2; echo "Waiting..."; done
	@echo "Waiting for AI Service to be ready..."
	@until curl -s http://localhost:8001/health > /dev/null; do sleep 2; echo "Waiting..."; done
	@echo "🚀 Running E2E Test..."
	npm run test:e2e
