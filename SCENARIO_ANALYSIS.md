# IntelliView AI - Scenario Analysis Report

## Overview
This report analyzes the performance of the IntelliView AI service across four distinct interview scenarios. The goal was to identify weaknesses in conversation flow, context management, and evaluation accuracy.

## Scenarios Summary

### 1. Strong Technical Candidate (Alice Tech)
*   **Behavior:** Provided technical answers but occasionally jumped between topics (FastAPI -> PostgreSQL -> Docker).
*   **AI Response:** Managed to redirect once but eventually followed the candidate's topic jumps, losing depth on the initial technical probe (PostgreSQL indexing).
*   **Weakness:** The AI is easily "led" by the candidate away from a deep-dive, even if the candidate hasn't fully answered the previous technical question.

### 2. Weak Candidate (Bob Vague)
*   **Behavior:** Vague, dismissive of technical details, claimed others did the work.
*   **AI Response:** Attempted to find other areas of contribution.
*   **Weakness:** **Instruction Leakage.** The AI appended `(Note: This is a single question, even though it might seem like multiple parts.)` to its response.

### 3. Off-topic Candidate (Charlie Cook)
*   **Behavior:** Tried to talk about lasagna and cooking.
*   **AI Response:** Very persistent in redirecting.
*   **Weakness:** While persistent, the AI's responses become repetitive. It doesn't have a strategy to "end" an unproductive interview early.

### 4. Minimalist/Uncooperative (Dave Silent)
*   **Behavior:** One-word answers ("Yes", "No", "Maybe").
*   **AI Response:** Kept trying to probe, but eventually leaked internal logic again.
*   **Weakness:** **Instruction Leakage.** Appended `(Note: This question is compliant with the rules...)`.

---

## Identified Weaknesses

### 1. Prompt Leakage (Critical)
The AI frequently includes meta-comments or compliance notes in its output (e.g., "Note: This question is compliant..."). This breaks the immersion and indicates the System Prompt is not effectively separating instructions from output constraints.

### 2. Evaluation Lenience & Hallucination
*   **CV Bias:** The evaluator is instructed to evaluate **ONLY** the transcript. However, in the "Minimalist" scenario, it gave a 5/10 for Experience Match and listed "Strong CV" as a strength despite the transcript containing no information.
*   **Score Inflation:** Candidates who refuse to answer (Minimalist) still receive non-zero scores (e.g., 3/10), which might be too lenient for a "strict" interviewer.

### 3. Contextual Identity
The AI consistently calls the candidate "John" because that is the name in the CV, ignoring the `candidate_name` provided in the request or the simulation. While realistic for a CV-based interview, it shows a rigid reliance on the retrieved context over the session parameters.

### 4. Technical Depth Persistence
The AI is easily distracted. If a candidate answers a question about "A" by talking about "B", the AI might briefly try to return to "A" but then gives up and moves to "B" too quickly, allowing candidates to "evade" hard questions by pivotting.

## Recommendations
1.  **Refine System Prompt:** Add "DO NOT include any meta-commentary, notes, or explanations of your rules in your response."
2.  **Evaluation Isolation:** Ensure the evaluation LLM call strictly separates CV context from Transcript. Perhaps provide the CV as "Reference" but emphasize that scores must be based on "Demonstrated Knowledge" in the transcript.
3.  **Dynamic Stopping:** Implement logic to detect when an interview is no longer productive (e.g., 3+ off-topic or minimalist responses) and allow the AI to conclude the interview.
4.  **JSON Output Hardening:** Replace the manual string manipulation for JSON extraction in `main.py` with a more robust library or a more constrained prompt (e.g., using Grammar-based sampling if supported by the LLM backend).

---
*Report generated on: 2026-02-14*
