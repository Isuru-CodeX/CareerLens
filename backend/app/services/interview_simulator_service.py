"""
app/services/interview_simulator_service.py - Real-Time Voice AI Mock Interview Simulator.
Evaluates STAR methodology adherence, words-per-minute (WPM), speech pacing,
filler word frequency, and generates dynamic adaptive follow-up probing questions.
"""
import re
import uuid
import logging
from typing import Dict, Any, List, Optional
from app.services.llm_client import LLMClient

logger = logging.getLogger("careerlens.interview_sim")

FILLER_PATTERNS = {
    "um": re.compile(r"\b(um+)\b", re.IGNORECASE),
    "uh": re.compile(r"\b(uh+|er+)\b", re.IGNORECASE),
    "like": re.compile(r"\b(like)\b", re.IGNORECASE),
    "you know": re.compile(r"\b(you know)\b", re.IGNORECASE),
    "basically": re.compile(r"\b(basically)\b", re.IGNORECASE),
    "actually": re.compile(r"\b(actually)\b", re.IGNORECASE),
    "sort of": re.compile(r"\b(sort of|kind of)\b", re.IGNORECASE),
    "literally": re.compile(r"\b(literally)\b", re.IGNORECASE),
    "i mean": re.compile(r"\b(i mean)\b", re.IGNORECASE),
}

STAR_KEYWORDS = {
    "situation": [
        "when i was at", "at my previous", "in my role as", "the company was",
        "our team was facing", "the project", "the situation was", "we were building",
        "the problem began", "context", "client required", "legacy system"
    ],
    "task": [
        "my goal was", "my responsibility was", "i was tasked with", "the challenge was",
        "we needed to", "the objective", "i had to", "responsible for", "the requirement was"
    ],
    "action": [
        "i designed", "i implemented", "i engineered", "i architected", "i refactored",
        "i created", "i introduced", "i optimized", "i coordinated", "i configured",
        "i migrated", "i deployed", "i initiated", "i led", "i wrote", "i built"
    ],
    "result": [
        "resulting in", "achieved", "improved", "reduced", "increased", "decreased",
        "percent", "%", "ms", "latency", "revenue", "saved", "users", "adoption",
        "successfully launched", "delivered ahead of", "kpi", "metric"
    ]
}

ROLE_QUESTION_BANKS = {
    "behavioral": [
        "Tell me about a time you had to resolve a high-stakes technical disagreement or conflict within your team.",
        "Describe a critical production incident or failure you were responsible for resolving under pressure.",
        "Can you share an experience where you had to quickly learn an unfamiliar technology stack to deliver a project?",
        "Tell me about a situation where you had to push back against unrealistic deadlines or changing product scope."
    ],
    "technical": [
        "Walk me through how you design high-throughput REST or GraphQL APIs to maintain sub-50ms latency under heavy load.",
        "How do you handle database indexing, query optimization, and transaction isolation when scaling relational databases?",
        "Explain your strategy for implementing robust automated testing and continuous integration (CI/CD) pipelines.",
        "How do you secure modern web applications against OWASP Top 10 vulnerabilities like injection and broken access control?"
    ],
    "system_design": [
        "How would you architect a real-time collaborative document editing platform like Google Docs or Figma?",
        "Design a distributed rate-limiting service capable of handling millions of requests per second across multiple regions.",
        "How would you structure a scalable notifications system supporting email, push notifications, and WebSockets?",
        "Design an end-to-end background asynchronous job processing pipeline with retries, dead-letter queues, and telemetry."
    ]
}

class InterviewSimulatorService:
    @staticmethod
    def generate_question(
        role_title: str,
        company: str,
        format_type: str = "mixed",
        turn_no: int = 1,
        previous_turns: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Generates structured interview questions tailored to candidate role and format.
        Uses Gemini LLM when available, falling back to curated role question banks.
        """
        role = role_title or "Software Professional"
        comp = company or "the target employer"
        format_norm = (format_type or "mixed").lower()

        client = LLMClient()
        if client.available:
            history_ctx = ""
            if previous_turns:
                history_ctx = "Previous interview turns:\n" + "\n".join([
                    f"Q{t.get('turn')}: {t.get('question')}\nA: {t.get('answer', '')[:120]}..."
                    for t in previous_turns
                ])

            prompt = (
                f"You are a Senior Technical Hiring Lead conducting an interview for {role} at {comp}.\n"
                f"Interview Format: {format_norm}. Question number: {turn_no}.\n"
                f"{history_ctx}\n\n"
                f"Generate a rigorous, realistic interview question.\n"
                f"Provide your response in JSON with keys:\n"
                f"- 'question': the interview question text\n"
                f"- 'category': 'behavioral', 'technical', or 'system_design'\n"
                f"- 'why_asked': 1 sentence explaining what competencies this evaluates\n"
                f"- 'star_guidance': brief tip on what a strong STAR response should highlight"
            )
            try:
                data = client.generate_json(
                    system="You are an expert technical interviewer at a top technology firm.",
                    user=prompt,
                    max_tokens=600
                )
                if isinstance(data, dict) and "question" in data:
                    return {
                        "question_id": f"q_{uuid.uuid4().hex[:8]}",
                        "turn": turn_no,
                        "question": data.get("question"),
                        "category": data.get("category", format_norm),
                        "why_asked": data.get("why_asked", f"Evaluates core execution competencies for {role}."),
                        "star_guidance": data.get("star_guidance", "Anchor your answer using Situation, Task, Action, and measurable Results.")
                    }
            except Exception as e:
                logger.warning(f"LLM question generation failed, falling back: {e}")

        # Deterministic Fallback Bank
        cat = format_norm
        if format_norm == "mixed":
            cats = ["behavioral", "technical", "system_design"]
            cat = cats[(turn_no - 1) % len(cats)]

        bank = ROLE_QUESTION_BANKS.get(cat, ROLE_QUESTION_BANKS["behavioral"])
        q_idx = (turn_no - 1) % len(bank)
        question_text = bank[q_idx]

        return {
            "question_id": f"q_{uuid.uuid4().hex[:8]}",
            "turn": turn_no,
            "question": question_text,
            "category": cat,
            "why_asked": f"Evaluates practical problem-solving and domain leadership for {role} at {comp}.",
            "star_guidance": "Frame your response around specific situations, technical decisions you made, and measurable outcomes."
        }

    @staticmethod
    def analyze_speech_metrics(transcript: str, duration_seconds: float) -> Dict[str, Any]:
        """
        Analyzes pacing (WPM), hesitation, and counts filler words.
        """
        clean_text = (transcript or "").strip()
        words = re.findall(r"\b\w+\b", clean_text)
        word_count = len(words)
        effective_duration = max(duration_seconds, 2.0)

        wpm = round((word_count / effective_duration) * 60) if word_count > 0 else 0

        # Pacing Assessment (Typical interview pacing is 100-165 WPM)
        if wpm == 0:
            pacing_status = "No speech detected"
            pacing_badge = "neutral"
        elif wpm < 95:
            pacing_status = "Deliberate / Slow Pacing (Consider speaking with more momentum)"
            pacing_badge = "warning"
        elif 95 <= wpm <= 165:
            pacing_status = "Optimal / Confident Pacing (100-160 WPM ideal for interviews)"
            pacing_badge = "success"
        else:
            pacing_status = "Fast / Rushed Pacing (Pause between thoughts to enhance clarity)"
            pacing_badge = "warning"

        # Filler words breakdown
        filler_breakdown = {}
        total_fillers = 0
        for filler_name, pattern in FILLER_PATTERNS.items():
            matches = pattern.findall(clean_text)
            cnt = len(matches)
            if cnt > 0:
                filler_breakdown[filler_name] = cnt
                total_fillers += cnt

        filler_density = round((total_fillers / max(word_count, 1)) * 100, 1)

        return {
            "word_count": word_count,
            "duration_seconds": round(effective_duration, 1),
            "wpm": wpm,
            "pacing_status": pacing_status,
            "pacing_badge": pacing_badge,
            "filler_count": total_fillers,
            "filler_density_pct": filler_density,
            "filler_breakdown": filler_breakdown
        }

    @staticmethod
    def evaluate_star_adherence(transcript: str, question: str) -> Dict[str, Any]:
        """
        Scores answer adherence to STAR methodology:
        - Situation (15%): Context established
        - Task (15%): Clear problem or requirement
        - Action (35%): Concrete active execution verbs
        - Result (35%): Quantified outcomes & metrics
        """
        text_lower = (transcript or "").lower()
        word_count = len(re.findall(r"\b\w+\b", text_lower))

        if word_count < 15:
            return {
                "situation_score": 25,
                "task_score": 25,
                "action_score": 20,
                "result_score": 15,
                "overall_star_score": 20,
                "is_star_compliant": False,
                "strengths": ["Quick initial response"],
                "growth_areas": ["Answer is too brief. Expand on the Situation, specific Actions, and quantified Results."],
                "follow_up_prompt": "Could you walk me through the specific technical actions you took and the measurable outcome of that project?"
            }

        # Situation Scoring
        s_matches = sum(1 for kw in STAR_KEYWORDS["situation"] if kw in text_lower)
        s_score = min(100, 45 + s_matches * 25)

        # Task Scoring
        t_matches = sum(1 for kw in STAR_KEYWORDS["task"] if kw in text_lower)
        t_score = min(100, 45 + t_matches * 25)

        # Action Scoring
        a_matches = sum(1 for kw in STAR_KEYWORDS["action"] if kw in text_lower)
        has_first_person = bool(re.search(r"\b(i|my|mine)\b", text_lower))
        a_score = min(100, (45 if has_first_person else 25) + a_matches * 18)

        # Result Scoring
        r_matches = sum(1 for kw in STAR_KEYWORDS["result"] if kw in text_lower)
        has_digits = bool(re.search(r"\b\d+[%kmx]?\b", text_lower))
        r_score = min(100, (40 if has_digits else 20) + r_matches * 22)

        # Weighted composite
        overall_star = round(
            s_score * 0.15 +
            t_score * 0.15 +
            a_score * 0.35 +
            r_score * 0.35
        )

        strengths = []
        growth_areas = []

        if a_score >= 70:
            strengths.append("Strong ownership demonstrated with proactive technical action verbs.")
        else:
            growth_areas.append("Highlight specific individual actions you took rather than describing what the team did in general.")

        if r_score >= 70:
            strengths.append("Excellent focus on quantifiable business and engineering impact.")
        else:
            growth_areas.append("Quantify the results: mention percentage improvements, latency reductions, or delivery timelines.")

        if s_score >= 70 and t_score >= 70:
            strengths.append("Clear problem framing and contextual setup.")
        else:
            growth_areas.append("Set up the situation and specific constraints clearly before diving into the implementation.")

        # Adaptive Follow-Up Probing Question
        follow_up = None
        if r_score < 60:
            follow_up = "What specific metrics, user feedback, or performance benchmarks demonstrated the success of your implementation?"
        elif a_score < 60:
            follow_up = "Which specific architectural or design decisions did you personally spearhead during that phase?"
        elif overall_star >= 75:
            follow_up = "If you had to tackle that same challenge today with modern tools, what would you engineer differently?"

        return {
            "situation_score": s_score,
            "task_score": t_score,
            "action_score": a_score,
            "result_score": r_score,
            "overall_star_score": overall_star,
            "is_star_compliant": overall_star >= 68,
            "strengths": strengths or ["Articulate professional communication"],
            "growth_areas": growth_areas or ["Maintain this structured storytelling format in future turns"],
            "follow_up_prompt": follow_up
        }

    @staticmethod
    def compile_scorecard(
        role_title: str,
        company: str,
        turns: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Compiles multimodal interview scorecard with radar scores, speech clarity,
        and hiring recommendation.
        """
        if not turns:
            return {
                "overall_score": 0,
                "recommendation": "Incomplete",
                "star_average": 0,
                "avg_wpm": 0,
                "total_fillers": 0,
                "summary": "No turns recorded."
            }

        star_scores = [t.get("star_evaluation", {}).get("overall_star_score", 50) for t in turns]
        avg_star = round(sum(star_scores) / len(star_scores))

        wpms = [t.get("speech_metrics", {}).get("wpm", 130) for t in turns if t.get("speech_metrics", {}).get("wpm", 0) > 0]
        avg_wpm = round(sum(wpms) / max(len(wpms), 1))

        total_fillers = sum(t.get("speech_metrics", {}).get("filler_count", 0) for t in turns)
        filler_densities = [t.get("speech_metrics", {}).get("filler_density_pct", 0) for t in turns]
        avg_filler_density = round(sum(filler_densities) / len(filler_densities), 1)

        # Fluency / speech score (penalizes excessive fillers, rewards optimal pacing)
        fluency_score = 100
        if avg_wpm < 100 or avg_wpm > 175:
            fluency_score -= 15
        fluency_score -= min(35, round(avg_filler_density * 8))
        fluency_score = max(30, min(100, fluency_score))

        # Overall composite
        overall = round(avg_star * 0.70 + fluency_score * 0.30)

        # Recommendation badge
        if overall >= 85:
            recommendation = "Strong Hire"
            verdict = "Exceptional structured communication with strong technical depth and metric-backed impact."
        elif overall >= 72:
            recommendation = "Hire"
            verdict = "Solid communication and clear competence. Ready for technical interview rounds."
        elif overall >= 58:
            recommendation = "Lean Hire"
            verdict = "Promising experience, but answers need stronger STAR metric results and reduced filler words."
        else:
            recommendation = "Needs Coaching"
            verdict = "Practice expanding answers with the STAR framework and speaking at a measured pace."

        all_strengths = []
        all_growth = []
        for t in turns:
            star_eval = t.get("star_evaluation", {})
            all_strengths.extend(star_eval.get("strengths", []))
            all_growth.extend(star_eval.get("growth_areas", []))

        # Unique deduplicated
        unique_strengths = list(dict.fromkeys(all_strengths))[:4]
        unique_growth = list(dict.fromkeys(all_growth))[:4]

        return {
            "overall_score": overall,
            "recommendation": recommendation,
            "verdict": verdict,
            "star_average": avg_star,
            "speech_clarity_score": fluency_score,
            "average_wpm": avg_wpm,
            "total_fillers_detected": total_fillers,
            "average_filler_density": avg_filler_density,
            "radar": {
                "STAR Adherence": avg_star,
                "Speech Pacing": 90 if 115 <= avg_wpm <= 165 else 65,
                "Conciseness": max(40, 100 - round(avg_filler_density * 10)),
                "Action Ownership": round(sum(t.get("star_evaluation", {}).get("action_score", 60) for t in turns) / len(turns)),
                "Metric Results": round(sum(t.get("star_evaluation", {}).get("result_score", 60) for t in turns) / len(turns))
            },
            "top_strengths": unique_strengths,
            "growth_areas": unique_growth,
            "total_questions_answered": len(turns)
        }
