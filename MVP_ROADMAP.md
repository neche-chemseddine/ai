# MVP Roadmap: IntelliView AI

This document serves as the master plan for the IntelliView AI project, consolidating the high-level roadmap and technical improvements, synchronized with the current project status as of February 16, 2026.

---

## 1. Project Status & Roadmap (16 Weeks)

### Phase 1-3: Core Infrastructure & AI Intelligence (Weeks 1-12)
- [x] **Core Engine:** Infrastructure, CV Parsing, and WebSocket Chat.
- [x] **Recruiter Dashboard:** Multi-tenancy, Interview management, and PDF Reports.
- [x] **AI Intelligence:** Migration to Groq (Llama 3.3 70B), Phase-aware logic, and CoT grading.
- [ ] **Week 10 (In Progress):** Load Testing (Target: 100 concurrent sessions).
- [ ] **Week 11:** Beta testing with 3 partner companies.
- [ ] **Week 12:** Initial V1.0 Launch.

### Phase 4: Gamified Experience - "Coding Game" Style (Weeks 13-16)
- [ ] **Stage 1: Knowledge Sprint (MCQ):** Implementation of dynamic AI-generated technical quizzes based on CV context.
- [ ] **Stage 2: Coding Arena (IDE):** Integration of Monaco Editor and secure containerized code execution environment.
- [ ] **Stage 3: The Boss Level (Chat):** Refactor the AI Chat to perform a "Code Defense" of the candidate's Stage 2 solution.
- [ ] **Unified Report Pipeline:** Consolidate Quiz scores, Test pass rates, and AI Chat transcripts into a single "Gamified Report."
- [ ] **Arena UI/UX:** High-fidelity "Game" interface with progress trackers and coding environment.

---

## 2. Core Engine Enhancement: Coherence & Criticality

The following features have been implemented to ensure human-level interview quality:

### A. Structured Interview Phases
- [x] **Verification (1-2 mins):** Validate specific claims from the CV.
- [x] **Breadth Scan (3-5 mins):** Touch on 3-4 different skills listed in the CV.
- [x] **Technical Deep Dive (10-15 mins):** Probe at least 3 levels deep into the candidate's most senior project.
- [x] **Realistic Scenario (5 mins):** A hypothetical problem-solving task tailored to the candidate's level.

### B. Intelligent Context & Probing
- [x] **CV Summary Injection:** Holistic view provided to the LLM at the start of every session.
- [x] **Mandatory Probing Logic:** AI automatically asks "How" or "Why" for vague answers.
- [x] **State Tracking:** Gateway tracks progress to ensure all phases are completed.

### C. Realistic & Critical Analysis ("The Brutal Evaluator")
- [x] **Chain-of-Thought Grading:** Internal auditor notes for technical accuracy and honesty.
- [x] **CV Inflation Check:** Identifying discrepancies between claims and actual knowledge.
- [x] **Score Grounding:** Every score (1-10) is justified by a direct quote from the transcript.

---

## 3. Go-To-Market (GTM) Strategy
- [ ] **Free Pilot:** Offer 10 free interviews to YC-style startups.
- [ ] **LinkedIn Outreach:** Target Engineering Managers directly.
- [ ] **ProductHunt Launch:** Focus on the "No more LeetCode" angle for candidates.
