import os
import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate, MessagesPlaceholder
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import PydanticOutputParser

# Pydantic schemas for structured outputs
class QuizQuestion(BaseModel):
    id: int = Field(description="Unique question identifier, starting from 1")
    question: str = Field(description="The question prompt, challenging and relevant")
    options: List[str] = Field(description="Exactly 4 multiple-choice options")
    correct_option_index: int = Field(description="0-indexed index of the correct option (0, 1, 2, or 3)")
    hint: str = Field(description="A subtle hint to guide the student if they get stuck")
    explanation: str = Field(description="Detailed explanation of why this option is correct and why others are incorrect")

class StudyQuiz(BaseModel):
    topic: str = Field(description="The topic of the quiz")
    difficulty: str = Field(description="The difficulty level (Beginner, Intermediate, Advanced)")
    questions: List[QuizQuestion] = Field(description="List of exactly 3 customized multiple-choice questions")

# Global Session Manager with File-Based Persistence
SESSIONS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sessions.json")

def load_sessions() -> Dict[str, Any]:
    if os.path.exists(SESSIONS_FILE):
        try:
            with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_sessions(sessions: Dict[str, Any]):
    try:
        with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(sessions, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving sessions: {e}")

def get_model(api_keys: dict):
    """Retrieve active LLM model based on provider and API keys."""
    provider = api_keys.get("active_provider", "gemini")
    
    if provider == "openai":
        key = api_keys.get("openai_api_key", "").strip()
        if not key:
            raise ValueError("OpenAI API Key is missing. Please set it in Settings.")
        return ChatOpenAI(
            model="gpt-4o-mini",
            api_key=key,
            temperature=0.7
        )
    else:  # default to gemini
        key = api_keys.get("gemini_api_key", "").strip()
        if not key:
            raise ValueError("Gemini API Key is missing. Please set it in Settings.")
        return ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=key,
            temperature=0.7
        )

def generate_study_guide(topic: str, level: str, api_keys: dict) -> str:
    """Generate a comprehensive study explanation based on topic and difficulty."""
    model = get_model(api_keys)
    
    prompt_template = """You are a friendly, encouraging, and extremely knowledgeable AI Study Buddy.
Your goal is to explain the topic '{topic}' to a student at the '{level}' level.

Guidelines for difficulty levels:
- **Beginner**: Explain concepts using simple terms, strong real-world analogies, high-level summaries, and no complex jargon or mathematics. Imagine you are explaining to a curious 10-year-old or someone completely new to the topic.
- **Intermediate**: Use professional terms, clear structured outlines, practical examples, and moderate details. Focus on how things work and why they matter.
- **Advanced**: Dive deep into technical architectures, underlying mathematical equations/formulas, trade-offs, edge cases, and research frontiers. Be academically rigorous and thorough.

Format your response in beautiful, readable Markdown. Include:
1. **Introduction**: A welcoming opening setting the stage.
2. **Key Concepts**: 3-4 subtopics in bullet points with highlighted terms.
3. **Analogy/Example**: A vivid, memorable analogy or real-world example matching the student's level.
4. **Summary**: A concise wrapping up of the main takeaways.

Stay positive and use formatting like bolding, lists, and tables to make it look premium and highly readable."""

    prompt = PromptTemplate(
        input_variables=["topic", "level"],
        template=prompt_template
    )
    
    chain = prompt | model
    response = chain.invoke({"topic": topic, "level": level})
    return response.content

def generate_quiz(topic: str, level: str, explanation: str, api_keys: dict) -> dict:
    """Generate a structured 3-question multiple choice quiz based on the explanation."""
    model = get_model(api_keys)
    
    # Primary approach: Use PydanticOutputParser with explicit JSON format instructions.
    # This is more reliable than with_structured_output because the format instructions
    # are embedded directly in the prompt, giving the LLM clear guidance on the schema.
    parser = PydanticOutputParser(pydantic_object=StudyQuiz)
    
    prompt_template = """You are a master teacher and study helper. Based on the topic '{topic}', difficulty '{difficulty}', and the explanation provided below, generate a 3-question multiple-choice quiz that tests deep understanding (not just rote memorization).

Explanation:
{explanation}

Generate exactly 3 questions. Ensure that:
1. Each question has an "id" (integer starting from 1).
2. Each question has a "question" string.
3. Each question has exactly 4 "options" (list of strings).
4. Each question has a "correct_option_index" (0-indexed integer: 0, 1, 2, or 3).
5. Each question has a "hint" that helps without giving the answer away.
6. Each question has an "explanation" detailing why the correct answer is right and why others are wrong.
7. The questions match the '{difficulty}' level.

{format_instructions}
"""
    prompt = PromptTemplate(
        input_variables=["topic", "difficulty", "explanation"],
        template=prompt_template,
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    try:
        chain = prompt | model | parser
        quiz_output = chain.invoke({
            "topic": topic,
            "difficulty": level,
            "explanation": explanation
        })
        
        result = quiz_output.model_dump()
        
        # Validate the output actually has questions
        if result.get("questions") and len(result["questions"]) > 0:
            print(f"[Quiz] Successfully generated {len(result['questions'])} questions via PydanticOutputParser.")
            return result
        else:
            print(f"[Quiz] PydanticOutputParser returned no questions. Output: {result}")
            raise ValueError("Quiz output has no questions")
        
    except Exception as e:
        print(f"[Quiz] PydanticOutputParser approach failed: {e}")
        print("[Quiz] Falling back to with_structured_output...")
    
    # Fallback approach: Use with_structured_output (tool calling / function calling)
    try:
        structured_model = model.with_structured_output(StudyQuiz)
        
        fallback_prompt_template = """You are a master teacher and study helper. Based on the topic '{topic}', difficulty '{difficulty}', and the explanation provided below, generate a 3-question multiple-choice quiz that tests deep understanding (not just rote memorization).

Explanation:
{explanation}

You MUST generate exactly 3 questions. Each question must include: id (integer starting from 1), question (string), options (list of exactly 4 strings), correct_option_index (0-indexed integer), hint (string), and explanation (string).
"""
        prompt = PromptTemplate(
            input_variables=["topic", "difficulty", "explanation"],
            template=fallback_prompt_template
        )
        
        chain = prompt | structured_model
        quiz_output = chain.invoke({
            "topic": topic,
            "difficulty": level,
            "explanation": explanation
        })
        
        # If it returned a Pydantic object, serialize it
        if isinstance(quiz_output, BaseModel):
            result = quiz_output.model_dump()
        else:
            result = quiz_output
        
        # Validate the output actually has questions
        if isinstance(result, dict) and result.get("questions") and len(result["questions"]) > 0:
            print(f"[Quiz] Successfully generated {len(result['questions'])} questions via with_structured_output.")
            return result
        else:
            print(f"[Quiz] with_structured_output returned incomplete data: {result}")
            raise ValueError("Quiz output has no questions from structured output either")
        
    except Exception as e:
        print(f"[Quiz] with_structured_output also failed: {e}")
        print("[Quiz] Using manual JSON extraction as last resort...")
    
    # Last resort: Ask the model to return raw JSON and parse it manually
    raw_prompt_template = """You are a master teacher. Generate a JSON quiz for the topic '{topic}' at '{difficulty}' level.

Based on this explanation:
{explanation}

Return ONLY a valid JSON object (no markdown code fences, no extra text) with this exact structure:
{{
  "topic": "{topic}",
  "difficulty": "{difficulty}",
  "questions": [
    {{
      "id": 1,
      "question": "Your question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_option_index": 0,
      "hint": "A helpful hint",
      "explanation": "Why this answer is correct"
    }},
    {{
      "id": 2,
      "question": "Second question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_option_index": 1,
      "hint": "A helpful hint",
      "explanation": "Why this answer is correct"
    }},
    {{
      "id": 3,
      "question": "Third question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_option_index": 2,
      "hint": "A helpful hint",
      "explanation": "Why this answer is correct"
    }}
  ]
}}

Generate exactly 3 questions with 4 options each. Return ONLY the JSON, nothing else."""

    prompt = PromptTemplate(
        input_variables=["topic", "difficulty", "explanation"],
        template=raw_prompt_template
    )
    
    chain = prompt | model
    response = chain.invoke({
        "topic": topic,
        "difficulty": level,
        "explanation": explanation
    })
    
    raw_text = response.content.strip()
    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[1] if "\n" in raw_text else raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3].strip()
    
    result = json.loads(raw_text)
    print(f"[Quiz] Last-resort JSON parse succeeded with {len(result.get('questions', []))} questions.")
    return result

def get_chat_response(session_id: str, user_message: str, api_keys: dict) -> str:
    """Send follow-up query to the tutor chatbot with conversation memory."""
    sessions = load_sessions()
    if session_id not in sessions:
        raise ValueError("Session not found. Please start a new study session first.")
        
    session = sessions[session_id]
    topic = session["topic"]
    level = session["level"]
    explanation = session["explanation"]
    chat_history_list = session.get("chat_history", [])
    
    model = get_model(api_keys)
    
    # Build history string
    history_str = ""
    for msg in chat_history_list[-10:]:  # Keep last 10 messages for context
        role = "Student" if msg["role"] == "user" else "Study Buddy"
        history_str += f"{role}: {msg['content']}\n"
        
    prompt_template = """You are a supportive, friendly AI Study Buddy. You are helping a student learn '{topic}' at the '{level}' level.
Here is the study material (explanation) that was generated for this session:
---
{explanation}
---

Use the chat history and the explanation above to answer the student's follow-up questions, explain difficult parts, give examples, or motivate them. Always stay in character as a encouraging study buddy who wants them to succeed. Keep your responses friendly, concise, and focused on helping them learn.

Chat History:
{chat_history}

Student: {user_message}
Study Buddy:"""

    prompt = PromptTemplate(
        input_variables=["topic", "level", "explanation", "chat_history", "user_message"],
        template=prompt_template
    )
    
    chain = prompt | model
    response = chain.invoke({
        "topic": topic,
        "level": level,
        "explanation": explanation,
        "chat_history": history_str,
        "user_message": user_message
    })
    
    # Save back to history
    chat_history_list.append({"role": "user", "content": user_message})
    chat_history_list.append({"role": "assistant", "content": response.content})
    session["chat_history"] = chat_history_list
    sessions[session_id] = session
    save_sessions(sessions)
    
    return response.content
