# MVP Improvement Proposal: Coherence & Criticality

This document outlines the next steps for enhancing the IntelliView AI interview engine to achieve human-level coherence and realistic, critical report generation.

## 1. Goal: Human-Level Interview Coherence
The current "random-walk" Q&A will be replaced by a structured **"Phase-Aware Orchestrator"**.

### A. Structured Interview Phases
The system will follow a mandatory progression:
1.  **Verification (1-2 mins):** Validate specific claims from the CV (e.g., "I see you used Kafka at Company X, what was the throughput?").
2.  **Breadth Scan (3-5 mins):** Touch on 3-4 different skills listed in the CV to ensure the candidate isn't a "one-trick pony".
3.  **Technical Deep Dive (10-15 mins):** Focus on the candidate's most senior project. The AI must probe at least 3 levels deep (e.g., "How?" -> "Why this tool?" -> "What were the failure modes?").
4.  **Realistic Scenario (5 mins):** A hypothetical problem-solving task tailored to the candidate's level (Junior vs. Senior).

### B. Intelligent Context & Probing
*   **CV Summary Injection:** The system prompt will now include a 500-word "Executive Summary" of the CV (generated once at the start) to give the AI a holistic view, regardless of RAG chunking.
*   **Mandatory Probing Logic:** If a candidate provides a vague answer (e.g., "I used Python to fix bugs"), the AI is strictly instructed to probe implementation details before moving to the next topic.
*   **State Tracking:** The Gateway will track "Topics Covered" to prevent repetitive questions and ensure a "Complete" interview.

## 2. Goal: Realistic & Critical Analysis
The report will shift from "Generic Summary" to **"Evidence-Based Critique"**.

### A. "The Brutal Evaluator" Persona
*   **Chain-of-Thought Grading:** The LLM will first generate "Internal Auditor Notes" where it critiques the candidate's technical accuracy and honesty. This section is hidden from the candidate but used to generate scores.
*   **Comparison with CV:** The AI will explicitly check for "CV Inflation" (e.g., if the CV says "Expert in Kubernetes" but the candidate can't explain a Sidecar pattern, they are penalized heavily).
*   **Score Grounding:** Every score (1-10) MUST be accompanied by a specific quote from the transcript as evidence.

### B. New Report Metrics
*   **Technical Depth Index:** Measures how many levels deep the candidate could go before becoming vague.
*   **Honesty & Accuracy:** Detects discrepancies between the CV and interview performance.
*   **Problem Solving Rigor:** Evaluates the logical flow of their scenario-based answers.

## 3. Technical Implementation Tasks

### Week 1: Core Engine Refactoring
*   [ ] **Upgrade RAG:** Implement "Query Expansion" where the LLM generates a search query based on the conversation state instead of using raw candidate text.
*   [ ] **Stateful Prompts:** Modify `ai_service/main.py` to support "Phase" instructions in the system prompt.
*   [ ] **Prompt Engineering:** Implement the "Verification -> Breadth -> Depth" logic in the system instruction.

### Week 2: Advanced Reporting
*   [ ] **CoT Evaluation:** Update `v1/report/generate` to use a multi-pass evaluation prompt (Audit -> Grade -> Synthesize).
*   [ ] **PDF Enhancement:** Add "Transcript Evidence" sections to the generated PDF.
*   [ ] **Skill Mapping:** Visualize "Claimed Skills" (CV) vs. "Proven Skills" (Interview).

## 4. Expected Outcome
The resulting interview will feel like a conversation with a Senior Architect who is looking for reasons *not* to hire, ensuring only high-quality candidates pass.
