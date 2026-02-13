# IntelliView AI - Development Makefile

.PHONY: install run-all run-ai run-gw run-fe docker-up docker-down help

# Colors for help message
BLUE := \033[34m
NC := \033[0m

help:
	@echo "Usage:"
	@echo "  make ${BLUE}install${NC}     - Install dependencies locally"
	@echo "  make ${BLUE}run-all${NC}     - Run all services locally (parallel)"
	@echo "  make ${BLUE}docker-up${NC}   - Start everything in Docker"
	@echo "  make ${BLUE}docker-down${NC} - Stop Docker containers"

install:
	@echo "Installing dependencies..."
	cd backend/ai_service && pip install -r requirements.txt
	cd backend/gateway && npm install
	cd frontend && npm install

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
	docker compose up --build

docker-down:
	@echo "Stopping Docker containers..."
	docker compose down
