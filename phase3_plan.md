# Phase 3 Plan: Refinement & Launch (Weeks 9-12)

## Week 9: Prompt Engineering & Evaluation Rubric Tuning
**Goal:** Enhance the quality, consistency, and "personality" of the AI interviewer and ensure evaluation scores align with human intuition.

### Tasks:
1.  **Audit Current Prompts:** Review the existing `system_prompt` in `ai_service/main.py` for clarity and role adherence.
2.  **Enhance Interviewer Persona:** Refine the prompt to make the AI more conversational yet rigorous (e.g., handling "I don't know" gracefully but probing depth).
3.  **Rubric Calibration:**
    -   Create a "Golden Test Set" of 3 mock transcripts (Junior, Senior, Mismatch).
    -   Run the `generate_report` endpoint against these transcripts multiple times to check for score variance.
    -   Refine the evaluation prompt to reduce hallucinations and ensure evidence-based scoring.
4.  **Handling Edge Cases:** Add logic or prompts to handle candidate questions (e.g., "Can you clarify the question?") without breaking character.

## Week 10: Load Testing
**Goal:** Ensure the system can handle concurrent sessions.
-   Use `locust` or `k6` to simulate 50-100 concurrent WebSocket connections.
-   Monitor Qdrant and LLM inference latency.

## Week 11: Beta Testing Preparation
**Goal:** Polish the UX for external users.
-   Add a "Feedback" form for recruiters.
-   Implement a simple "Help" or "FAQ" modal.
-   Final security sweep (ensure no debug logs in production).

## Week 12: V1.0 Release
**Goal:** Public launch readiness.
-   Finalize documentation (User Guide).
-   Prepare marketing assets (screenshots, demo video).
-   Deploy to a public cloud provider (optional/if time permits).
