# Functional Specification: IntelliView AI (Gamified Edition)

## 1. User Roles & Permissions
*   **Admin:** Manage tenants, system-wide LLM configurations, and billing.
*   **Recruiter:** Upload CVs, generate assessment links, and review multi-stage reports.
*   **Candidate:** Complete the multi-stage assessment (Quiz -> Code -> Chat).

## 2. Core Features: The "Coding Game" Assessment

The interview process is transitioned from a simple chat into a structured, three-stage technical gauntlet.

### 2.1. Stage 1: Knowledge Sprint (Dynamic MCQ)
*   **Description:** A timed series of multiple-choice questions tailored to the candidate's CV.
*   **Mechanics:** 
    *   AI analyzes CV and generates 5-10 technical questions.
    *   Questions cover Frameworks, Languages, and Best Practices.
*   **Acceptance Criteria:** Questions must be relevant to the candidate's seniority level.

### 2.2. Stage 2: Coding Challenge (Live IDE)
*   **Description:** A hands-on programming task within a browser-based IDE.
*   **Mechanics:**
    *   Candidate is presented with a problem statement and a starting code template.
    *   Real-time syntax highlighting and auto-completion.
    *   "Run Tests" button to check logic against hidden/visible test cases.
*   **Acceptance Criteria:** Code must be persisted in real-time. Results of test cases must be recorded for AI review in Stage 3.

### 2.3. Stage 3: The Boss Level (AI Probing & Theory)
*   **Description:** A chat-based "defense" of the code written in Stage 2.
*   **Mechanics:**
    *   AI reads the candidate's code and test results.
    *   **Phase 1 (Code Defense):** AI asks about specific implementation choices (e.g., "Why did you use a recursion here?").
    *   **Phase 2 (Theory Deep-Dive):** AI pivots to advanced architectural or theoretical concepts based on the task.
*   **Acceptance Criteria:** AI must reference specific line numbers or logic from the Stage 2 code.

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
