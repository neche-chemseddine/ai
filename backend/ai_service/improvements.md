# IntelliView AI: System Weakness Demonstration

## Setup: Parsing CV (sample.pdf)
Session ID: f3a3f879-83eb-42e3-a8ef-32729e3201e8

## Scenario 1: Memory Loss (History Ignored)
Description: Testing if the AI remembers its own previous question or the candidate's answer.

[S1] AI: Hello Chayma, welcome to the interview. I've reviewed your CV and I'm impressed with your extensive experience and knowledge in various areas of artificial intelligence, machine learning, deep learning, computer vision, and research. I'd like to start by asking about your experience with NeRF-based models for view synthesis. Could you please explain what NeRF stands for, and describe your role and contributions to the project you mentioned in your CV? Additionally, what were some of the challenges you faced while implementing these models and how did you overcome them?
[S1] CANDIDATE: I have 5 years of experience with Python, specifically building APIs with FastAPI.
[S1] AI: Great to know that you have experience with Python and building APIs using FastAPI. Could you describe a specific project you have worked on using FastAPI, and what were some of the challenges you faced during development and how did you address those challenges? Additionally, what are some advantages you find in using FastAPI compared to other web frameworks, and how does it help you in building efficient and scalable APIs?
[S1] CANDIDATE: Could you tell me why you asked that specifically?
[S1] AI: I asked about your experience with NeRF-based models because of your mention of working on view synthesis projects using NeRF models in your CV. I wanted to understand your background and expertise in this area.

Regarding the question about FastAPI, I asked about a specific project you have worked on using this framework to assess your hands-on experience, the challenges you faced, and the advantages you found in using FastAPI. This will help me evaluate your problem-solving skills and your ability to apply your knowledge to real-world projects.

> COMMENT: Note how the AI likely provides a generic response or asks a completely new question, failing to explain its previous reasoning because the history was not passed to the LLM.

## Scenario 2: RAG Failure (Context Retrieval)
Description: Testing if short answers cause the system to lose CV context.

[S2] CANDIDATE: Yes, I am.
[S2] AI: Great! I see from your CV that you have experience with deep learning and computer vision, specifically with NeRF models. Could you please explain to me what NeRF stands for and how it's used for view synthesis?

[Pause to allow the candidate to answer]

If the candidate provides a good explanation, ask a follow-up question. If not, ask for clarification or provide a brief explanation to guide them. For example, "NeRF stands for Neural Radiance Fields, it's a deep learning model used for representing scenes in 3D and rendering images from novel viewpoints. How does it work exactly?"

[Pause again to give the candidate a chance to respond]

If the candidate seems to be struggling, offer gentle hints or ask a related question. For example, "Do you recall how 3D point clouds are typically represented in deep learning models? Could NeRF be considered an extension of that idea?" or "What other approaches have you come across for generating images from 3D scenes in computer graphics or computer vision?"

> COMMENT: Because 'Yes, I am' has no technical keywords, the vector search retrieves irrelevant chunks or nothing at all. The AI's response will likely be disconnected from the CV.

## Scenario 3: Evaluation Hallucination
Description: Generating a report for a very poor/short interview.

### Generated Scores for 'Lazy Candidate':
{
  "technical_score": 0,
  "communication_score": 0,
  "problem_solving_score": 1,
  "experience_match_score": 1,
  "strengths": [
    "Insufficient data"
  ],
  "weaknesses": [
    "Candidate provided insufficient or vague responses."
  ],
  "summary": "The interview was too short or vague to provide a meaningful evaluation."
}

> COMMENT: Check if the AI gave high scores (e.g., > 5) for these 2-word answers. Often, models are too 'nice' or hallucinate skills based on the CV even if not demonstrated in the transcript.
