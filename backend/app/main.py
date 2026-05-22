import uuid
import datetime
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.config import get_api_keys, save_api_keys
from app.tutor import (
    generate_study_guide,
    generate_quiz,
    get_chat_response,
    load_sessions,
    save_sessions
)

app = FastAPI(title="Study Buddy Tutor API", version="1.0.0")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify front-end domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic schemas for requests
class APIKeyRequest(BaseModel):
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    active_provider: Optional[str] = None

class SessionRequest(BaseModel):
    topic: str
    level: str  # Beginner, Intermediate, Advanced

class ChatRequest(BaseModel):
    session_id: str
    message: str

class GradeRequest(BaseModel):
    session_id: str
    answers: Dict[str, int]  # maps question_id string to selected option index (int)


# Helper function to get API keys and validate
def get_valid_keys():
    keys = get_api_keys()
    # Mask actual keys for security if returning to client, but let backend use full keys
    return keys


@app.get("/api/config")
async def get_config():
    """Retrieve configuration state (tells if keys are set without exposing them)."""
    keys = get_api_keys()
    return {
        "has_gemini_key": bool(keys.get("gemini_api_key")),
        "has_openai_key": bool(keys.get("openai_api_key")),
        "active_provider": keys.get("active_provider", "gemini")
    }


@app.post("/api/config")
async def update_config(payload: APIKeyRequest):
    """Save API keys and provider selection securely."""
    try:
        keys = save_api_keys(
            gemini_key=payload.gemini_api_key,
            openai_key=payload.openai_api_key,
            active_provider=payload.active_provider
        )
        return {
            "status": "success",
            "message": "Configuration updated successfully",
            "has_gemini_key": bool(keys.get("gemini_api_key")),
            "has_openai_key": bool(keys.get("openai_api_key")),
            "active_provider": keys.get("active_provider", "gemini")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save configuration: {str(e)}")


@app.post("/api/start-session")
async def start_session(payload: SessionRequest):
    """Initialize a study session: detect topic/level, generate guide & quiz."""
    keys = get_api_keys()
    provider = keys.get("active_provider", "gemini")
    
    # Validation
    if provider == "gemini" and not keys.get("gemini_api_key"):
        raise HTTPException(
            status_code=400,
            detail="Gemini API Key is missing. Please set it in settings to begin."
        )
    elif provider == "openai" and not keys.get("openai_api_key"):
        raise HTTPException(
            status_code=400,
            detail="OpenAI API Key is missing. Please set it in settings to begin."
        )

    try:
        session_id = str(uuid.uuid4())
        
        # 1 & 2. Generate Explanation
        explanation = generate_study_guide(payload.topic, payload.level, keys)
        
        # 3. Generate Structured Quiz
        quiz = generate_quiz(payload.topic, payload.level, explanation, keys)
        
        # Save session to persistent store
        sessions = load_sessions()
        sessions[session_id] = {
            "session_id": session_id,
            "topic": payload.topic,
            "level": payload.level,
            "explanation": explanation,
            "quiz": quiz,
            "chat_history": [
                {
                    "role": "assistant",
                    "content": f"Hi! I'm your Study Buddy today. I've prepared a comprehensive guide on **{payload.topic}** ({payload.level} level) and created an interactive 3-question quiz for you! You can read the guide and take the quiz in the panel on the right. If you have any questions or need something explained differently, just ask me here!"
                }
            ],
            "score": None,
            "created_at": datetime.datetime.now().isoformat()
        }
        save_sessions(sessions)
        
        return {
            "session_id": session_id,
            "topic": payload.topic,
            "level": payload.level,
            "explanation": explanation,
            "quiz": quiz,
            "chat_history": sessions[session_id]["chat_history"]
        }
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate study materials: {str(e)}")


@app.post("/api/chat")
async def chat(payload: ChatRequest):
    """Chat with the AI tutor for follow-up questions."""
    keys = get_api_keys()
    try:
        response = get_chat_response(payload.session_id, payload.message, keys)
        return {"response": response}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process chat: {str(e)}")


@app.get("/api/sessions")
async def list_sessions():
    """Retrieve all saved learning sessions."""
    try:
        sessions = load_sessions()
        # Sort by creation time (newest first)
        sorted_sessions = sorted(
            sessions.values(),
            key=lambda x: x.get("created_at", ""),
            reverse=True
        )
        
        # Return a summarized version to keep it lightweight
        summary = []
        for s in sorted_sessions:
            summary.append({
                "session_id": s["session_id"],
                "topic": s["topic"],
                "level": s["level"],
                "created_at": s.get("created_at", ""),
                "score": s.get("score")
            })
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load sessions: {str(e)}")


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    """Retrieve a single session's full details."""
    sessions = load_sessions()
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return sessions[session_id]


@app.post("/api/grade-quiz")
async def grade_quiz(payload: GradeRequest):
    """Evaluate quiz answers, provide feedback, and record overall score."""
    sessions = load_sessions()
    if payload.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = sessions[payload.session_id]
    quiz = session.get("quiz")
    if not quiz or "questions" not in quiz:
        raise HTTPException(status_code=400, detail="Quiz not found for this session")
        
    questions = quiz["questions"]
    graded_questions = []
    correct_count = 0
    
    # Match user answers against correct options
    for q in questions:
        q_id_str = str(q["id"])
        selected_index = payload.answers.get(q_id_str)
        correct_index = q["correct_option_index"]
        
        is_correct = (selected_index == correct_index)
        if is_correct:
            correct_count += 1
            
        graded_questions.append({
            "id": q["id"],
            "question": q["question"],
            "selected_option_index": selected_index,
            "correct_option_index": correct_index,
            "is_correct": is_correct,
            "explanation": q["explanation"]
        })
        
    score_percentage = int((correct_count / len(questions)) * 100)
    
    # Save the score to the session
    session["score"] = score_percentage
    
    # Insert a grading summary message into the chat history from the tutor
    feedback_msg = f"**Quiz Graded!** You scored **{correct_count}/3** ({score_percentage}%).\n\n"
    if correct_count == 3:
        feedback_msg += "Excellent job! You've completely mastered this explanation. 🎓 Feel free to ask any deeper questions, or select a new topic!"
    elif correct_count == 2:
        feedback_msg += "Great work! You understood most of the concepts. Review the explanations on the right side to master the remaining part. 👍"
    else:
        feedback_msg += "Keep studying! Learning is a process. Let's go over the material again. Feel free to ask me to explain any of these questions in more detail! 💡"
        
    session["chat_history"].append({
        "role": "assistant",
        "content": feedback_msg
    })
    
    sessions[payload.session_id] = session
    save_sessions(sessions)
    
    return {
        "score": score_percentage,
        "correct_count": correct_count,
        "total_questions": len(questions),
        "results": graded_questions,
        "chat_history": session["chat_history"]
    }
