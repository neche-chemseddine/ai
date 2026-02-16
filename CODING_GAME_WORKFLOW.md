# Coding Game Style Assessment Workflow

This document describes the multi-stage "Coding Game" interview flow, which transitions from surface-level knowledge to hands-on coding and final theoretical deep-dives.

---

## 1. Assessment Stages

### Stage 1: The Knowledge Sprint (MCQs)
*   **Format:** 5-10 Multiple Choice Questions.
*   **Logic:** AI generates questions dynamically based on the CV's listed tech stack (e.g., "In React, what is the primary use of `useMemo`?").
*   **Goal:** Quick verification of framework/language familiarity.

### Stage 2: The Coding Challenge (Hands-on)
*   **Format:** A live coding environment (IDE) with a specific problem statement.
*   **Logic:** The candidate is given a task (e.g., "Implement a rate-limiter in Python") and must pass a set of test cases.
*   **Goal:** Verify implementation skills, algorithmic thinking, and code quality.

### Stage 3: The Boss Level (AI Deep-Dive)
*   **Format:** Conversational chat with the AI.
*   **Logic:** The AI reviews the code written in Stage 2. It asks "Why" the candidate chose a specific approach, probes for edge cases, and asks theoretical questions related to the framework used.
*   **Goal:** Differentiate between "copy-pasters" and engineers who understand their code.

---

## 2. Technical Architecture for Coding Game

### A. Frontend: The "Arena" UI
*   **IDE Component:** Integration of `monaco-editor` (VS Code core) or `react-codemirror`.
*   **Terminal:** A read-only terminal to display build logs and test results.
*   **Progress Stepper:** Visual indicator of the current stage (Quiz -> Code -> Chat).

### B. Backend: Code Execution Engine
*   **Sandbox:** A secure, containerized environment (Docker-in-Docker or specialized sandbox like `Isolate`) to execute candidate code.
*   **Test Runner:** A Python/Node.js script that runs the candidate's code against hidden test cases and returns JSON results.

### C. AI Service: Code-Reviewer Persona
*   **Context Injection:** The AI service receives the final code from Stage 2 as part of its system prompt.
*   **Prompting:** "Analyze the candidate's code for [Challenge X]. Ask them about their choice of data structure in line 15."

---

## 3. User Experience (UX) Flow
1.  **Entry:** Candidate logs in and sees a "Start Challenge" dashboard.
2.  **Quiz:** Timed MCQs with a "Next" button that locks answers.
3.  **IDE:** Side-by-side view: Problem Statement (Left) | Code Editor (Center) | Chat/Terminal (Right - initially hidden).
4.  **Submission:** Candidate clicks "Run Tests," then "Submit Solution."
5.  **Interview:** The Right panel (Chat) expands. The AI says: "I see you used a Hash Map for the lookup. How would this scale if the data was distributed across multiple nodes?"
