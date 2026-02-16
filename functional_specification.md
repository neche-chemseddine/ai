# Functional Specification: IntelliView AI (Serious Technical Assessment)

## 1. Vision & Tone
IntelliView AI is designed as a **professional bar-raiser system**. It departs from generic "friendly" AI to provide a rigorous, objective, and deeply technical evaluation. The tone is serious, professional, and uncompromising on technical standards.

## 2. Core Features: The Multi-Stage Gauntlet

The interview process is a 3-stage gauntlet, each independently evaluated to provide a 360-degree technical signal.

### 2.1. Stage 1: Knowledge Sprint (Deep MCQ)
*   **Description:** A high-pressure, technical MCQ stage focusing on language internals and architecture.
*   **Evaluation:** Immediate scoring and AI-generated critique of the candidate's theoretical foundation.

### 2.2. Stage 2: Coding Arena (Hands-on Challenge)
*   **Description:** A complex programming task requiring idiomatic code and algorithmic efficiency.
*   **Evaluation:** Automated code review focusing on complexity (Big O), edge cases, and code quality.

### 2.3. Stage 3: The Boss Level (Code Defense)
*   **Description:** A deep-dive discussion where the AI probes the candidate's implementation choices and theoretical depth.
*   **Evaluation:** Final comprehensive report synthesizing signals from all three stages.

### 2.4. Integrated Evaluation & Review
*   **Description:** A comprehensive web-based review page and consolidated PDF report.
*   **Review Page Features:**
    *   **Executive Summary:** Technical scores, Auditor Notes, and Hire/No-Hire recommendation.
    *   **Quiz Analysis:** Detailed breakdown of candidate's MCQ choices vs. correct answers.
    *   **Code Review:** Syntax-highlighted view of the Stage 2 coding solution and execution results.
    *   **Transcript:** Full searchable history of the Stage 3 AI conversation.
*   **Metrics:**
    *   **Quiz Accuracy:** % of correct MCQs.
    *   **Code Quality:** Cleanliness, complexity, and test pass rate.
    *   **Theoretical Depth:** AI's evaluation of the conversational defense.
    *   **Evidence:** Key quotes from the chat and code snippets.

## 3. Interview Status Tracking
| Status | Description |
| :--- | :--- |
| **Pending** | Assessment created, candidate hasn't started. |
| **Quiz** | Candidate is currently in Stage 1. |
| **Coding** | Candidate is currently in Stage 2. |
| **Chat** | Candidate is currently in Stage 3 (Final defense). |
| **Completed** | Full report generated and ready. |

## 4. Technical Requirements
*   **IDE:** Integrated Monaco Editor.
*   **Execution:** Containerized execution environment for Python/JS/Go.
*   **LLM Context:** High-token window support for injecting full source code into the Stage 3 chat.
