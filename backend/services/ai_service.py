"""
AI Service Module
Supports multiple AI providers: OpenAI, Llama 3, Mistral, DeepSeek, Gemma
Configure via environment variables.
"""
import os
import json
import re
from typing import Optional, List, Dict, Any

# ─── Configuration ─────────────────────────────────────────────

AI_PROVIDER = os.getenv("AI_PROVIDER", "openai").lower()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
LOCAL_API_URL = os.getenv("LOCAL_API_URL", "http://localhost:11434/api/generate")
LOCAL_MODEL = os.getenv("LOCAL_MODEL", "llama3")

# Auto-downgrade to demo mode when no real credentials are configured
_no_openai_key = AI_PROVIDER == "openai" and OPENAI_API_KEY in ("", "your-openai-api-key-here")
_no_groq_key = AI_PROVIDER == "groq" and GROQ_API_KEY in ("", "your-groq-api-key-here")
_no_local = AI_PROVIDER in ("ollama", "local", "llama", "mistral", "gemma", "deepseek")
if _no_openai_key or _no_groq_key:
    AI_PROVIDER = "demo"

# ─── Internal Helpers ──────────────────────────────────────────

def _truncate_text(text: str, max_chars: int = 12000) -> str:
    """Truncate text to fit within token limits."""
    if len(text) > max_chars:
        return text[:max_chars] + "\n\n[Text truncated due to length...]"
    return text


def _parse_json_from_response(response_text: str) -> Optional[Dict[str, Any]]:
    """Try to extract JSON from AI response text."""
    # Try direct JSON parse
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        pass

    # Try to find JSON block in markdown
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # Try to find anything that looks like { ... }
    brace_match = re.search(r'\{[\s\S]*\}', response_text)
    if brace_match:
        try:
            return json.loads(brace_match.group(0))
        except json.JSONDecodeError:
            pass

    return None


# ─── OpenAI Provider ───────────────────────────────────────────

def _call_openai(prompt: str, system_prompt: str = "You are a helpful study assistant.") -> str:
    """Call OpenAI API."""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=2000,
        )
        return response.choices[0].message.content.strip()
    except ImportError:
        raise Exception("OpenAI library not installed. Run: pip install openai")
    except Exception as e:
        raise Exception(f"OpenAI API error: {str(e)}")

def _call_groq(prompt: str, system_prompt: str = "You are a helpful study assistant.") -> str:
    """Call Groq API using the OpenAI client."""
    try:
        from openai import OpenAI
        client = OpenAI(
            api_key=GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1"
        )
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=2000,
        )
        return response.choices[0].message.content.strip()
    except ImportError:
        raise Exception("OpenAI library not installed. Run: pip install openai")
    except Exception as e:
        raise Exception(f"Groq API error: {str(e)}")


# ─── Local (Ollama) Provider ───────────────────────────────────

def _call_local(prompt: str, system_prompt: str = "You are a helpful study assistant.") -> str:
    """Call a local model via Ollama API."""
    try:
        import requests
        payload = {
            "model": LOCAL_MODEL,
            "prompt": f"{system_prompt}\n\n{prompt}",
            "stream": False,
        }
        response = requests.post(LOCAL_API_URL, json=payload, timeout=120)
        response.raise_for_status()
        data = response.json()
        return data.get("response", "").strip()
    except ImportError:
        raise Exception("Requests library not installed. Run: pip install requests")
    except Exception as e:
        raise Exception(f"Local AI API error: {str(e)}")


# ─── Router ────────────────────────────────────────────────────

def _call_demo(prompt: str, system_prompt: str = "") -> str:
    """
    Demo provider — returns realistic placeholder responses so the app is
    fully usable without any API key.  Responses are keyed on the kind of
    task detected in the prompt.
    """
    sp = system_prompt.lower()

    # ── Summary ──────────────────────────────────────────────────
    if "summar" in sp:
        return json.dumps({
            "short_summary": "This document covers foundational concepts in the subject area, introducing key terminology, core principles, and practical applications that form the basis of further study.",
            "detailed_summary": "The document begins by establishing the theoretical framework underpinning the subject. It introduces essential vocabulary and explains how each concept relates to the broader field.\n\nThe middle sections examine specific mechanisms and processes in detail, providing worked examples and case studies that ground abstract ideas in real-world contexts.\n\nThe concluding sections synthesise the material, highlighting relationships between concepts and suggesting directions for further reading and research.",
            "key_concepts": "Core theoretical framework\nKey terminology and definitions\nPractical applications\nCase studies and examples\nSynthesis of main ideas",
            "definitions": "Concept: A fundamental idea that forms the basis of understanding in this field.\nFramework: A structured set of principles used to organise and interpret information.\nApplication: The practical use of theoretical knowledge in real-world scenarios.",
            "learning_outcomes": "Understand the core theoretical framework presented in the document.\nIdentify and define key terminology accurately.\nApply the concepts to practical scenarios.\nAnalyse relationships between different ideas in the material.\nEvaluate the significance of the material within the broader field."
        })

    # ── Quiz ──────────────────────────────────────────────────────
    if "quiz" in sp:
        return json.dumps([
            {"question": "What is the primary focus of this document?", "question_type": "multiple_choice",
             "option_a": "The theoretical framework of the subject", "option_b": "Historical background only",
             "option_c": "Mathematical proofs", "option_d": "Unrelated topics",
             "correct_answer": "The theoretical framework of the subject"},
            {"question": "Key terminology is introduced to help readers understand the subject.", "question_type": "true_false",
             "option_a": "", "option_b": "", "option_c": "", "option_d": "", "correct_answer": "True"},
            {"question": "What does the document provide to ground abstract concepts?", "question_type": "multiple_choice",
             "option_a": "Case studies and examples", "option_b": "Poetry",
             "option_c": "Sports statistics", "option_d": "Cooking recipes",
             "correct_answer": "Case studies and examples"},
            {"question": "The document concludes by isolating concepts without connecting them.", "question_type": "true_false",
             "option_a": "", "option_b": "", "option_c": "", "option_d": "", "correct_answer": "False"},
            {"question": "Name one learning outcome a student should achieve from this document.", "question_type": "short_answer",
             "option_a": "Understanding the core theoretical framework", "option_b": "", "option_c": "", "option_d": "",
             "correct_answer": "Understanding the core theoretical framework"},
        ])

    # ── Flashcards ────────────────────────────────────────────────
    if "flashcard" in sp:
        return json.dumps([
            {"front": "What is the core theoretical framework?", "back": "A structured set of principles used to organise and interpret information in this subject area."},
            {"front": "Define 'key concept'", "back": "A fundamental idea that forms the basis of understanding; mastering it unlocks deeper comprehension of the subject."},
            {"front": "What role do case studies play?", "back": "They ground abstract theories in real-world contexts, making concepts easier to understand and apply."},
            {"front": "What are learning outcomes?", "back": "Specific skills or knowledge a student should acquire after studying the material."},
            {"front": "How does the document conclude?", "back": "By synthesising the material, highlighting relationships between concepts, and suggesting directions for further study."},
        ])

    # ── Chat fallback ─────────────────────────────────────────────
    if "answer" in sp or "chat" in sp:
        # Extract the last line as the question
        lines = [l.strip() for l in prompt.strip().split("\n") if l.strip()]
        last = lines[-1] if lines else ""
        q = last.replace("Student's question:", "").strip() or "your question"
        return (
            f"Based on the uploaded document, here is what I can tell you about \"{q}\": "
            "The document addresses this topic within its core theoretical framework. "
            "Key concepts and definitions relevant to your question are covered in the main sections. "
            "I recommend reviewing the key concepts section for a detailed explanation. "
            "\n\n*(Demo mode — connect an OpenAI API key or local model for full AI responses.)*"
        )

    return "I have processed your request. Please connect an AI provider (OpenAI API key or local Ollama model) in the backend .env file for full AI-powered responses."


def _call_ai(prompt: str, system_prompt: str = "You are a helpful study assistant.") -> str:
    """Route the AI call to the configured provider."""
    if AI_PROVIDER == "openai":
        return _call_openai(prompt, system_prompt)
    elif AI_PROVIDER == "groq":
        return _call_groq(prompt, system_prompt)
    elif AI_PROVIDER in ("ollama", "local", "llama", "mistral", "gemma", "deepseek"):
        return _call_local(prompt, system_prompt)
    elif AI_PROVIDER == "demo":
        return _call_demo(prompt, system_prompt)
    else:
        raise ValueError(f"Unknown AI provider: {AI_PROVIDER}")


# ─── Summary Generation ────────────────────────────────────────

def generate_summary(document_text: str) -> Dict[str, str]:
    """
    Generate a comprehensive summary of the document.
    Returns dict with: short_summary, detailed_summary, key_concepts,
                       definitions, learning_outcomes
    """
    text = _truncate_text(document_text)

    prompt = f"""Based on the following study material, provide a comprehensive analysis in JSON format. 
The JSON must have exactly these keys:
- "short_summary": A brief 2-3 sentence overview
- "detailed_summary": A detailed summary of 3-5 paragraphs covering all main points
- "key_concepts": A list of 5-8 key concepts from the material, separated by newlines
- "definitions": Important definitions found in the material, each on a new line with the term followed by a colon and its definition
- "learning_outcomes": 3-5 learning outcomes a student should achieve after studying this material, each on a new line

Study Material:
{text}

Respond ONLY with a valid JSON object, no other text."""

    system_prompt = "You are an expert study assistant that creates structured summaries from educational material. Always respond with valid JSON."
    
    response = _call_ai(prompt, system_prompt)
    
    # Try to parse as JSON
    parsed = _parse_json_from_response(response)
    if parsed:
        return {
            "short_summary": parsed.get("short_summary", "Summary not available."),
            "detailed_summary": parsed.get("detailed_summary", "Detailed summary not available."),
            "key_concepts": parsed.get("key_concepts", "Key concepts not available."),
            "definitions": parsed.get("definitions", "Definitions not available."),
            "learning_outcomes": parsed.get("learning_outcomes", "Learning outcomes not available."),
        }
    
    # Fallback: parse sections from text
    sections = {
        "short_summary": "",
        "detailed_summary": "",
        "key_concepts": "",
        "definitions": "",
        "learning_outcomes": "",
    }
    
    current_section = None
    section_headers = {
        "short summary": "short_summary",
        "detailed summary": "detailed_summary",
        "key concepts": "key_concepts",
        "definitions": "definitions",
        "learning outcomes": "learning_outcomes",
    }
    
    for line in response.split("\n"):
        line_lower = line.lower().strip()
        for header, key in section_headers.items():
            if header in line_lower:
                current_section = key
                break
        else:
            if current_section and line.strip():
                sections[current_section] += line.strip() + "\n"
    
    for key in sections:
        sections[key] = sections[key].strip() or f"{key.replace('_', ' ').title()} not generated."
    
    return sections


# ─── Quiz Generation ───────────────────────────────────────────

def generate_quiz(document_text: str, quiz_type: str = "mixed") -> List[Dict[str, Any]]:
    """
    Generate quiz questions from the document text.
    
    Args:
        document_text: The text content of the document
        quiz_type: "multiple_choice", "true_false", "short_answer", or "mixed"
    
    Returns:
        List of question dicts with keys: question, question_type, option_a/b/c/d (for MC),
        correct_answer
    """
    text = _truncate_text(document_text)

    type_instructions = {
        "multiple_choice": "All questions should be multiple choice with 4 options (A, B, C, D).",
        "true_false": "All questions should be true or false questions. Use 'True' or 'False' as correct_answer.",
        "short_answer": "All questions should be short answer questions. For these, option_a should contain the expected answer and options b-d can be empty strings.",
        "mixed": "Mix of multiple choice, true/false, and short answer questions.",
    }

    prompt = f"""Based on the following study material, create a quiz with 5 questions.

{type_instructions.get(quiz_type, type_instructions["mixed"])}

Respond ONLY with a JSON array of question objects. Each object must have:
- "question": The question text
- "question_type": "multiple_choice", "true_false", or "short_answer"
- "option_a": First option or expected answer (for short answer)
- "option_b": Second option (empty string for short answer/true_false)
- "option_c": Third option (empty string for short answer/true_false)
- "option_d": Fourth option (empty string for short answer/true_false)
- "correct_answer": The correct answer

Study Material:
{text}

Return ONLY a valid JSON array, no other text."""

    system_prompt = "You are an expert quiz creator. You create educational quiz questions from study material. Always respond with valid JSON."

    response = _call_ai(prompt, system_prompt)
    
    parsed = _parse_json_from_response(response)
    if parsed and isinstance(parsed, list):
        return parsed[:10]  # Limit to 10 questions max

    # Fallback: return a placeholder question
    return [{
        "question": "What is the main topic of this document?",
        "question_type": "short_answer",
        "option_a": "Refer to the document for the answer",
        "option_b": "",
        "option_c": "",
        "option_d": "",
        "correct_answer": "Refer to the document for the answer"
    }]


# ─── Flashcard Generation ──────────────────────────────────────

def generate_flashcards(document_text: str) -> List[Dict[str, str]]:
    """
    Generate exactly 10 valid flashcards from the document text.
    Retries once if the AI returns fewer than 10 valid cards.
    """
    if not document_text or not document_text.strip():
        raise ValueError("Cannot generate flashcards because the document is empty.")

    text = _truncate_text(document_text)

    system_prompt = (
        "You are an expert flashcard creator. "
        "Create accurate, distinct flashcards using only the supplied study material. "
        "Always respond with valid JSON."
    )

    def build_prompt(retry: bool = False) -> str:
        retry_instruction = (
            " Your previous response did not contain 10 valid flashcards. "
            "Correct this and return exactly 10 complete, distinct cards."
            if retry else ""
        )

        return f"""Based ONLY on the following study material, create EXACTLY 10 distinct flashcards.
Each flashcard must test an important fact, definition, process, principle, or concept from the document.
Do not invent information or use outside knowledge.
Keep each question concise and each answer clear and accurate.
Do not repeat questions or concepts.{retry_instruction}

Respond ONLY with a valid JSON array containing exactly 10 objects.
Every object must contain:
- "front": A concise question or concept.
- "back": A clear and complete answer based on the document.

Study Material:
{text}

Return ONLY the JSON array. Do not include markdown or explanations."""

    def normalize_cards(response: str) -> List[Dict[str, str]]:
        parsed = _parse_json_from_response(response)

        if not isinstance(parsed, list):
            return []

        cards = []
        seen_fronts = set()

        for item in parsed:
            if not isinstance(item, dict):
                continue

            front = item.get("front") or item.get("question") or item.get("concept") or ""
            back = item.get("back") or item.get("answer") or item.get("definition") or ""

            if not isinstance(front, str) or not isinstance(back, str):
                continue

            front = front.strip()
            back = back.strip()

            if not front or not back:
                continue

            normalized_front = " ".join(front.lower().split())
            if normalized_front in seen_fronts:
                continue

            seen_fronts.add(normalized_front)
            cards.append({"front": front, "back": back})

            if len(cards) == 10:
                break

        return cards

    for attempt in range(2):
        response = _call_ai(
            build_prompt(retry=(attempt == 1)),
            system_prompt
        )

        cards = normalize_cards(response)

        if len(cards) == 10:
            return cards

    raise RuntimeError(
        "The AI could not generate exactly 10 valid flashcards from this document. "
        "Please try generating the flashcards again."
    )


def chat_with_document(question: str, document_text: str, conversation_history: Optional[List[Dict[str, str]]] = None) -> str:
    """
    Answer a question based on the document content.
    The AI only uses information from the uploaded document.
    """
    text = _truncate_text(document_text)

    history_text = ""
    if conversation_history:
        history_parts = []
        for msg in conversation_history[-6:]:  # Last 6 messages for context
            role = msg.get("role", "user")
            content = msg.get("content", "")
            history_parts.append(f"{role.capitalize()}: {content}")
        history_text = "\n".join(history_parts)

    prompt = f"""You are a study assistant that ONLY answers questions based on the provided document.

Document Content:
{text}

{'Previous conversation:' if history_text else ''}
{history_text}

Student's question: {question}

IMPORTANT: Only use information from the document above to answer. If the question cannot be answered from the document, say "I cannot find information about this in the uploaded document." Do not use any external knowledge."""

    system_prompt = "You are a helpful study assistant that answers questions strictly based on the uploaded document content."

    return _call_ai(prompt, system_prompt)
