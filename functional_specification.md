# Functional Specification: IntelliView AI

## 1. User Roles & Permissions
*   **Admin:** Manage tenants (companies), system-wide LLM configurations, and billing.
*   **Recruiter:** Upload CVs, create interview links, view reports, and manage candidate pipelines.
*   **Candidate:** Access the public interview link, conduct the chat, and view completion status.

## 2. Core Features

### 2.1. Authentication & Tenancy
*   **Description:** Multi-tenant secure login.
*   **User Story:** As a recruiter, I want to log in securely so that I can only see my company's candidates.
*   **Acceptance Criteria:** Support for Email/Password and Google OAuth. JWT-based session management.
*   **Edge Cases:** User belongs to multiple organizations.

### 2.2. CV Upload & Parsing
*   **Description:** Upload PDF/Docx CV and extract structured technical data.
*   **User Story:** As a recruiter, I want to upload a CV so the AI can prepare for the interview.
*   **Acceptance Criteria:** Supports files up to 10MB. Extracts: Years of experience, Core Languages, Frameworks, and Project Summaries.
*   **Failure Scenario:** Corrupt PDF or image-only PDF (requires OCR fallback).

### 2.3. AI Interview Engine (The "Interviewer")
*   **Description:** Real-time chat interface where AI asks questions and reacts to answers.
*   **Structured Flow:**
    -   **Single Question Rule:** The AI must only ask one technical question at a time.
    -   **Progress Tracking:** The system tracks the number of questions answered.
    -   **Session Limit:** The interview automatically concludes after 3 answered questions (configurable up to 10).
    -   **Auto-Completion:** Once the limit is reached, the session is locked, and the evaluation report is generated immediately.
*   **User Story:** As a candidate, I want to have a conversation that feels natural and technically challenging.
*   **Acceptance Criteria:** Latency < 2s for response generation. Ability to handle "I don't know" or clarifying questions from the candidate.
*   **Failure Scenario:** LLM hallucination or loop (requires a "session monitor" to reset if detected).

### 2.4. Interview Status Tracking
*   **Table: Status Lifecycle**
| Status | Description |
| :--- | :--- |
| **Pending** | Link created, candidate hasn't started. |
| **In-Progress** | Candidate is currently chatting. |
| **Processing** | Interview finished, AI is generating the report. |
| **Completed** | Report ready for review. |
| **Expired** | Link validity period passed. |

### 2.5. Evaluation & Reporting
*   **Description:** Post-interview summary with scores (1-10) across various dimensions.
*   **User Story:** As a recruiter, I want a 1-page summary of the candidate's performance.
*   **Acceptance Criteria:** Score breakdown for: Technical Depth, Communication, Problem Solving, and Experience Match.
