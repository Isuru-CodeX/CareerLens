"""
backend/tests/test_interviews.py - Test suite for Real-Time Voice AI Mock Interview Simulator.
Tests: Session creation, turn-by-turn question generation, speech metrics (WPM, fillers),
STAR adherence scoring, adaptive probing follow-up, and multimodal scorecard compilation.
"""
import os
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db
from app.services.interview_simulator_service import InterviewSimulatorService

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_db():
    init_db()
    yield

def test_speech_metrics_calculation():
    # 60 words in 30 seconds = 120 WPM (optimal)
    transcript = "I designed and deployed a microservices architecture using FastAPI, Docker, and PostgreSQL. We had a problem with high database latency, so I introduced Redis caching and read replicas. This reduced our p99 response times from 350ms to 45ms and allowed the platform to handle 10x traffic during Black Friday sales without downtime."
    res = InterviewSimulatorService.analyze_speech_metrics(transcript, 30.0)
    assert res["wpm"] >= 80
    assert "Optimal" in res["pacing_status"] or "Confident" in res["pacing_status"]
    assert res["filler_count"] == 0

    # Transcript with fillers: "um", "like", "basically", "you know"
    filler_transcript = "Um, like basically we had, you know, a server crash and um I had to restart it."
    f_res = InterviewSimulatorService.analyze_speech_metrics(filler_transcript, 10.0)
    assert f_res["filler_count"] >= 4
    assert "um" in f_res["filler_breakdown"]
    assert "basically" in f_res["filler_breakdown"]

def test_star_adherence_evaluation():
    # Strong STAR response
    strong_star = "In my role as Lead Backend Engineer at Acme Corp, the company was facing severe Redis memory exhaustion during flash sales. My goal was to decrease memory consumption by 50% without dropping cache hit rates. I architected and implemented an LRU eviction strategy and migrated session data to disk-backed persistent stores. As a result, memory consumption decreased by 58%, saving $14,000 in monthly cloud infrastructure costs."
    eval_res = InterviewSimulatorService.evaluate_star_adherence(strong_star, "Tell me about a challenging technical project.")
    assert eval_res["overall_star_score"] >= 70
    assert eval_res["is_star_compliant"] is True
    assert eval_res["action_score"] >= 60
    assert eval_res["result_score"] >= 60

    # Weak response without metrics or action
    weak_star = "The project was okay. The team worked together and we fixed some bugs."
    weak_res = InterviewSimulatorService.evaluate_star_adherence(weak_star, "Tell me about a challenge.")
    assert weak_res["overall_star_score"] < 50
    assert weak_res["is_star_compliant"] is False
    assert weak_res["follow_up_prompt"] is not None

def test_full_interview_session_api_flow():
    unique_email = f"voice_sim_{os.urandom(4).hex()}@careerlens.ai"
    reg = client.post("/api/auth/register", json={
        "email": unique_email,
        "password": "Password123!",
        "full_name": "Voice Interview Candidate"
    })
    assert reg.status_code == 200
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Start Session
    start_resp = client.post("/api/interviews/session/start", headers=headers, json={
        "role_title": "Senior Distributed Systems Engineer",
        "company": "Stripe",
        "format_type": "technical"
    })
    assert start_resp.status_code == 200
    session_data = start_resp.json()
    session_id = session_data["session_id"]
    assert session_data["turn_no"] == 1
    assert "question" in session_data["initial_question"]
    assert "question" in session_data["first_question"]
    assert session_data["first_question"]["question"] == session_data["initial_question"]["question"]

    # 2. Answer Turn 1 using frontend field names (turn_index, answer_text)
    answer_text = "When I was at my previous company, we were facing a distributed deadlock issue in our Kafka processing pipeline. I was tasked with redesigning the consumer group partition rebalancing. I engineered an idempotent processing deduplication filter and configured backpressure thresholds. This reduced message re-processing latency by 74% and saved 120 engineering hours per quarter."
    ans_resp = client.post(f"/api/interviews/session/{session_id}/answer", headers=headers, json={
        "turn_index": 1,
        "question": session_data["first_question"]["question"],
        "answer_text": answer_text,
        "duration_seconds": 25.0
    })
    assert ans_resp.status_code == 200
    ans_data = ans_resp.json()
    assert ans_data["speech_metrics"]["wpm"] > 50
    assert ans_data["star_evaluation"]["overall_star_score"] >= 65
    assert ans_data["next_question"] is not None
    assert "suitable_answers" in ans_data
    assert len(ans_data["suitable_answers"]) >= 2
    assert "spoken_script" in ans_data["suitable_answers"][0]
    assert "star_breakdown" in ans_data["suitable_answers"][0]

    # 3. Complete Session
    complete_resp = client.post(f"/api/interviews/session/{session_id}/complete", headers=headers, json={
        "notes": "Practice session completed."
    })
    assert complete_resp.status_code == 200
    complete_data = complete_resp.json()
    assert complete_data["status"] == "completed"
    assert complete_data["scorecard"]["overall_score"] > 50
    assert "radar" in complete_data["scorecard"]

    # 4. Retrieve session history
    list_resp = client.get("/api/interviews/sessions", headers=headers)
    assert list_resp.status_code == 200
    sessions_list = list_resp.json()
    assert len(sessions_list) >= 1
    assert sessions_list[0]["id"] == session_id

