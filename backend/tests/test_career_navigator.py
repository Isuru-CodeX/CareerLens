"""
backend/tests/test_career_navigator.py - Automated tests for Career Path Knowledge Graph & Offer Negotiation Coach.
Tests Dijkstra shortest-path bridging, skill gap classification, salary prediction percentiles,
negotiation game-theory mechanics, and FastAPI REST endpoints.
"""
import os
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db
from app.services.career_graph_service import CareerGraphService, CAREER_ROLES
from app.services.salary_predictor_service import SalaryPredictorService

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_db():
    app.dependency_overrides.clear()
    init_db()
    yield
    app.dependency_overrides.clear()


def test_career_knowledge_graph_structure():
    """Verifies the career graph contains complete role nodes, categories, and level tiers."""
    graph = CareerGraphService.get_graph_data()
    assert "nodes" in graph
    assert "edges" in graph
    assert "categories" in graph
    assert len(graph["nodes"]) >= 15
    assert len(graph["edges"]) >= 20

    # Ensure each node contains complete metadata
    for node in graph["nodes"]:
        assert "id" in node
        assert "title" in node
        assert "category" in node
        assert "level" in node
        assert "salary_range" in node
        assert "core_skills" in node
        assert node["salary_range"]["min"] < node["salary_range"]["max"]


def test_dijkstra_career_bridge():
    """Verifies Dijkstra shortest-path finds realistic career progression and categorized gaps."""
    # Test path from Junior Frontend to Senior Full Stack Engineer
    res = CareerGraphService.find_career_bridge(
        current_role_id="junior_frontend",
        target_role_id="senior_fullstack",
        candidate_skills=["TypeScript", "Docker", "JavaScript", "HTML5"]
    )

    assert res["path_found"] is True
    assert len(res["path"]) >= 2
    assert res["path"][0] == "junior_frontend"
    assert res["path"][-1] == "senior_fullstack"
    assert res["total_estimated_months"] >= 24
    assert 0 <= res["feasibility_score"] <= 100

    # Check categorized skill gaps
    gap = res["skill_gap_analysis"]
    assert "verified_skills" in gap
    assert "transferrable_skills" in gap
    assert "missing_skills" in gap
    assert "TypeScript" in gap["verified_skills"] or "Docker" in gap["verified_skills"]

    # Check structured learning roadmap
    roadmap = res["learning_roadmap"]
    assert len(roadmap) >= 2
    assert "Phase 1:" in roadmap[0]["phase"]
    assert "duration_weeks" in roadmap[0]
    assert "skills" in roadmap[0]


def test_salary_predictor_percentile_bands():
    """Verifies salary compensation regression produces monotonic percentiles and skill ROI premiums."""
    pred = SalaryPredictorService.predict_compensation(
        role_title="Senior Full Stack Engineer",
        experience_years=6.0,
        skills=["Kubernetes", "Distributed Systems", "PyTorch", "TypeScript"],
        location_tier="us_tier1",
        company_tier="enterprise_faang"
    )

    pct = pred["percentiles"]
    assert pct["p25"] < pct["p50"] < pct["p75"] < pct["p90"]
    assert pred["currency"] == "USD"
    assert pred["suggested_negotiation_anchor"] >= pct["p75"]

    # Check skill boosters
    assert len(pred["skill_roi_boosters"]) >= 2
    top_booster = pred["skill_roi_boosters"][0]
    assert top_booster["bonus_pct"] > 0
    assert top_booster["estimated_annual_lift"] > 0

    # Check company stage variations (early startup has lower base than enterprise FAANG)
    startup_pred = SalaryPredictorService.predict_compensation(
        role_title="Senior Full Stack Engineer",
        experience_years=6.0,
        location_tier="us_tier1",
        company_tier="early_startup"
    )
    assert startup_pred["percentiles"]["p50"] < pred["percentiles"]["p50"]


def test_negotiation_turn_game_theory():
    """Verifies negotiation roleplay evaluates leverage, firmness, and recruiter counter concessions."""
    # Test high-leverage candidate pitch citing competing offers & market benchmarks
    pitch = (
        "Thank you so much for the offer. Based on industry benchmark data from Levels.fyi for a Senior Full Stack Engineer "
        "and my specialized experience driving distributed systems and cloud architecture, I am targeting $165,000. "
        "I also have another competing offer in final stages, but your team is my top choice. If we can reach $165,000, "
        "or bridge the difference with a signing bonus, I am ready to sign today."
    )

    result = SalaryPredictorService.evaluate_negotiation_turn(
        role_title="Senior Full Stack Engineer",
        current_offer=140000,
        target_salary=165000,
        candidate_pitch=pitch,
        turn_no=1
    )

    assert result["metrics"]["leverage_score"] >= 70
    assert result["metrics"]["acceptance_probability"] >= 50
    assert result["signals_detected"]["competing_offer"] is True
    assert result["signals_detected"]["market_data_anchor"] is True
    assert result["signals_detected"]["total_comp_flexibility"] is True
    assert result["financial_outcome"]["concession_amount"] > 0
    assert result["financial_outcome"]["new_offer"] > 140000
    assert len(result["recruiter_reply"]) > 50
    assert len(result["coach_critique"]) > 20


def test_counter_offer_scripts_generation():
    """Verifies generation of 5 battle-tested negotiation script templates."""
    scripts = SalaryPredictorService.generate_counter_offer_scripts(
        role_title="Full Stack Engineer",
        company="Stripe",
        current_offer=130000,
        target_salary=150000,
        highlight_skill="Kubernetes & Microservices"
    )

    assert len(scripts) == 5
    script_ids = [s["id"] for s in scripts]
    assert "market_anchor" in script_ids
    assert "competing_offer" in script_ids
    assert "total_comp_bridge" in script_ids
    assert "accelerated_review" in script_ids
    assert "quick_phone_pitch" in script_ids

    for s in scripts:
        assert "$150,000" in s["script"] or "$130,000" in s["script"]
        assert len(s["description"]) > 10


def test_career_navigator_api_endpoints():
    """FastAPI integration tests verifying REST API responses."""
    unique_email = f"career_nav_{os.urandom(4).hex()}@careerlens.ai"
    reg = client.post("/api/auth/register", json={
        "email": unique_email,
        "password": "Password123!",
        "full_name": "Career Navigator Tester"
    })
    token = reg.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    # 1. GET /api/career/graph
    r_graph = client.get("/api/career/graph", headers=headers)
    assert r_graph.status_code == 200
    assert "nodes" in r_graph.json()

    # 2. POST /api/career/bridge
    r_bridge = client.post("/api/career/bridge", json={
        "current_role_id": "mid_frontend",
        "target_role_id": "lead_fullstack",
        "candidate_skills": ["TypeScript", "React", "Next.js", "Docker"]
    }, headers=headers)
    assert r_bridge.status_code == 200
    data_b = r_bridge.json()
    assert data_b["path_found"] is True
    assert len(data_b["path"]) >= 2

    # 3. GET /api/career/salary/metadata
    r_meta = client.get("/api/career/salary/metadata", headers=headers)
    assert r_meta.status_code == 200
    assert "location_tiers" in r_meta.json()

    # 4. POST /api/career/salary/predict
    r_sal = client.post("/api/career/salary/predict", json={
        "role_title": "Backend Distributed Systems Engineer",
        "experience_years": 4.5,
        "skills": ["Go", "Kubernetes", "PostgreSQL"],
        "location_tier": "us_tier1"
    }, headers=headers)
    assert r_sal.status_code == 200
    data_s = r_sal.json()
    assert data_s["percentiles"]["p50"] > 90000

    # 5. POST /api/career/negotiate/scripts
    r_scripts = client.post("/api/career/negotiate/scripts", json={
        "role_title": "Staff Engineer",
        "company": "Datadog",
        "current_offer": 190000,
        "target_salary": 225000
    }, headers=headers)
    assert r_scripts.status_code == 200
    assert len(r_scripts.json()) == 5
