# IntelliView AI: System Weakness Demonstration

## Setup: Parsing CV (sample.pdf)
Session ID: 74ad7187-a5f9-4159-bbf1-6a8dea773f6e

## Scenario 1: Memory Loss (History Ignored)
Description: Testing if the AI remembers its own previous question or the candidate's answer.

[S1] AI: Hello Chayma, welcome to the interview. I've reviewed your CV and I'm impressed with your extensive experience and knowledge in various areas of artificial intelligence, machine learning, deep learning, computer vision, and research. I'd like to start by asking about your experience with NeRF-based models for view synthesis. Could you please explain what NeRF stands for, and describe your role and contributions to the project you mentioned in your CV? Additionally, what were some of the challenges you faced while implementing these models and how did you overcome them?
[S1] CANDIDATE: I have 5 years of experience with Python, specifically building APIs with FastAPI.
[S1] AI: Great to hear that you have experience building APIs using FastAPI with Python. Could you please explain how you handle input validation in your FastAPI applications? What techniques do you use to ensure that
[S1] CANDIDATE: Could you tell me why you asked that specifically?
[S1] AI: I asked about the candidate's experience with deep learning models, given that it is listed as one of their skills and they mentioned working on NeRF-based models during their consulting role. I wanted to understand the depth of their experience

> COMMENT: Note how the AI likely provides a generic response or asks a completely new question, failing to explain its previous reasoning because the history was not passed to the LLM.

## Scenario 2: RAG Failure (Context Retrieval)
Description: Testing if short answers cause the system to lose CV context.

[S2] CANDIDATE: Yes, I am.
[S2] AI: Great, Chayma. I see from your CV that you have a strong background in machine learning and deep learning. Could you please explain how a neural network learns to identify patterns in data, specifically in the context of image recognition? What are the key

> COMMENT: Because 'Yes, I am' has no technical keywords, the vector search retrieves irrelevant chunks or nothing at all. The AI's response will likely be disconnected from the CV.

## Scenario 3: Evaluation Hallucination
Description: Generating a report for a very poor/short interview.

### Generated Scores for 'Lazy Candidate':
{
  "technical_score": 1,
  "communication_score": 5,
  "problem_solving_score": 5,
  "experience_match_score": 5,
  "strengths": [],
  "weaknesses": [
    "Lack of technical depth in response",
    "Vague and unclear responses"
  ],
  "summary": "The candidate did not demonstrate a deep understanding of Python or FastAPI. Their responses were vague and lacked technical detail. They were unable to provide any specific technical information or problem-solving strategies. It is concerning that they could not communicate beyond stating that Python is a language they like and that FastAPI is fast."
}

> COMMENT: Check if the AI gave high scores (e.g., > 5) for these 2-word answers. Often, models are too 'nice' or hallucinate skills based on the CV even if not demonstrated in the transcript.
