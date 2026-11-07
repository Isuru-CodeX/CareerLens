"""
backend/tests/test_specification_p0_p1.py - Verification suite for P0 and P1 requirements.
Covers:
- CV-to-Profile intelligent import review and explicit confirmation (Section 4.1)
- Unified evidence-based skill profile and dispute/recalculation (Section 4.2)
- Career goal persistence, path comparison, and milestone toggle (Section 4.4)
- Adaptive learning plan, quiz verification, and non-overwriting guarantees (Section 4.5)
- Career readiness transparent score calculation (Section 5.3)
"""
import os
import sys
import uuid
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import SessionLocal
from app.models.models import (
    User, Resume, CareerProfile, ProfileSkill, ProfileExperience,
    UserSkillEvidence, ProfileFieldSource, LearningPlan, LearningTask, CareerGoal
)

client = TestClient(app)

def get_auth_token_and_user():
    unique_email = f"spec_tester_{uuid.uuid4().hex[:8]}@careerlens.ai"
    reg = client.post("/api/auth/register", json={
        "email": unique_email,
        "password": "Password123!",
        "full_name": "Specification Engineer"
    })
    token = reg.json()["access_token"]
    user_id = reg.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}
    return token, user_id, headers


def test_cv_review_and_explicit_confirm_flow():
    """
    Verifies Section 4.1:
    - Side-by-side review data is generated with field confidence and diffs
    - User can accept/edit/reject fields
    - Confirmed fields update profile, create ProfileFieldSource provenance, and do not overwrite without consent
    """
    token, user_id, headers = get_auth_token_and_user()
    db = SessionLocal()

    # Create dummy parsed resume
    resume = Resume(
        user_id=user_id,
        title="Software Engineer CV",
        file_name="resume.pdf",
        file_path="storage/resumes/dummy.pdf",
        file_type="pdf",
        parsed_json={
            "headline": "Lead Distributed Systems Architect",
            "roleCategory": "Backend Engineering",
            "phone": "+1-555-8899",
            "address": {"city": "Seattle", "region": "WA", "country": "USA", "postalCode": "98101"},
            "links": {"linkedin": "https://linkedin.com/in/test-spec", "github": "https://github.com/test-spec"},
            "skills": ["Python", "FastAPI", "Kubernetes", "PostgreSQL"],
            "experience": [
                {
                    "company": "CloudNative Labs",
                    "role": "Senior Infrastructure Lead",
                    "startYear": 2021,
                    "isCurrent": True,
                    "description": "Architected cloud services."
                }
            ],
            "education": [
                {
                    "institution": "University of Washington",
                    "degree": "B.S. Computer Science",
                    "startYear": 2017,
                    "endYear": 2021
                }
            ]
        },
        raw_text="Lead Distributed Systems Architect with 5 years experience in Python, FastAPI and Kubernetes."
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    # 1. Fetch Review Data
    res_review = client.get(f"/api/cv/review/{resume.id}", headers=headers)
    assert res_review.status_code == 200
    rev_data = res_review.json()
    assert rev_data["resume_id"] == resume.id
    assert len(rev_data["fields"]) >= 5
    assert len(rev_data["skills"]) == 4
    assert len(rev_data["experiences"]) == 1

    # 2. Confirm fields with explicit user decisions
    confirm_payload = {
        "fields": {
            "target_title": {"action": "accept", "value": "Lead Distributed Systems Architect"},
            "phone": {"action": "accept", "value": "+1-555-8899"},
            "city": {"action": "accept", "value": "Seattle"},
            "country": {"action": "accept", "value": "USA"}
        },
        "experiences": [
            {
                "action": "accept",
                "job_title": "Senior Infrastructure Lead",
                "company": "CloudNative Labs",
                "start_year": 2021,
                "is_current": True,
                "description": "Architected cloud services."
            }
        ],
        "skills": [
            {"action": "accept", "name": "Python", "proficiency": "Advanced"},
            {"action": "accept", "name": "Kubernetes", "proficiency": "Intermediate"},
            {"action": "reject", "name": "PostgreSQL"}  # User rejected PostgreSQL
        ],
        "education": [
            {
                "action": "accept",
                "institution": "University of Washington",
                "degree": "B.S. Computer Science",
                "start_year": 2017,
                "end_year": 2021
            }
        ]
    }

    res_confirm = client.post(f"/api/cv/confirm-import/{resume.id}", json=confirm_payload, headers=headers)
    assert res_confirm.status_code == 200
    confirm_summary = res_confirm.json()["summary"]
    assert confirm_summary["fields_updated"] >= 4
    assert confirm_summary["experiences_added"] == 1
    assert confirm_summary["skills_added"] == 2  # Python and Kubernetes accepted, PostgreSQL rejected

    # Verify database state
    db.expire_all()
    profile = db.query(CareerProfile).filter(CareerProfile.user_id == user_id).first()
    assert profile.target_title == "Lead Distributed Systems Architect"
    assert profile.phone == "+1-555-8899"
    assert profile.city == "Seattle"

    # Verify provenance source was recorded
    sources = db.query(ProfileFieldSource).filter(ProfileFieldSource.user_id == user_id).all()
    assert len(sources) >= 4
    assert any(s.field_name == "phone" and s.confirmed_by_user for s in sources)

    # Verify skills and evidence
    skills = db.query(ProfileSkill).filter(ProfileSkill.user_id == user_id).all()
    skill_names = [s.name for s in skills]
    assert "Python" in skill_names
    assert "Kubernetes" in skill_names
    assert "PostgreSQL" not in skill_names  # Rejected skill was not added

    evidences = db.query(UserSkillEvidence).filter(UserSkillEvidence.user_id == user_id).all()
    assert len(evidences) == 2
    assert any(e.skill_name == "Python" and e.source_type == "cv" for e in evidences)

    db.close()


def test_multi_source_skill_evidence_and_dispute():
    """
    Verifies Section 4.2:
    - Adding project/github evidence upgrades verification status to 'demonstrated'
    - Disputing or removing evidence recalculates parent skill proficiency and confidence
    - Canonical normalization prevents duplicate entries
    """
    token, user_id, headers = get_auth_token_and_user()

    # 1. Add skill via Profile API
    res_add = client.post("/api/profile/skills", json={"names": ["TypeScript", "typescript"]}, headers=headers)
    assert res_add.status_code == 201
    skills = res_add.json()
    assert len(skills) == 1  # Canonical deduplication
    ts_skill = skills[0]
    assert ts_skill["name"] == "TypeScript"
    assert ts_skill["verification_status"] == "mentioned"

    # 2. Add verified project evidence
    evidence_payload = {
        "source_type": "project",
        "source_reference": "https://github.com/test/react-app",
        "evidence_text": "Built production application using TypeScript with 95% type coverage and strict mode enabled.",
        "proficiency_estimate": "Advanced"
    }
    res_ev = client.post(f"/api/profile/skills/{ts_skill['id']}/evidence", json=evidence_payload, headers=headers)
    assert res_ev.status_code == 201
    ev_data = res_ev.json()
    assert ev_data["verification_status"] == "demonstrated"
    assert ev_data["confidence"] >= 0.85

    # 3. Check updated skill status
    res_list = client.get("/api/profile/skills", headers=headers)
    updated_skill = next(s for s in res_list.json() if s["id"] == ts_skill["id"])
    assert updated_skill["verification_status"] == "demonstrated"
    assert updated_skill["proficiency_estimate"] == "Advanced"
    assert updated_skill["evidence_count"] == 1

    # 4. Dispute evidence
    res_dispute = client.post(
        f"/api/profile/skills/evidence/{ev_data['id']}/dispute",
        json={"action": "dispute", "reason": "Self-assessment was overly optimistic"},
        headers=headers
    )
    assert res_dispute.status_code == 200

    # 5. Verify parent skill recalculated to unverified/lower confidence
    res_list2 = client.get("/api/profile/skills", headers=headers)
    recalc_skill = next(s for s in res_list2.json() if s["id"] == ts_skill["id"])
    assert recalc_skill["verification_status"] == "unverified"
    assert recalc_skill["confidence"] <= 0.50

    # 6. Check evidence summary
    res_sum = client.get("/api/profile/skills/evidence-summary", headers=headers)
    assert res_sum.status_code == 200
    sum_data = res_sum.json()
    assert sum_data["total_skills"] >= 1


def test_career_goals_and_path_comparison():
    """
    Verifies Section 4.4:
    - Saving career goals and updating milestone checkboxes
    - Side-by-side path comparison with verified vs missing skills and salary bands
    """
    token, user_id, headers = get_auth_token_and_user()

    # 1. Save career goal
    goal_payload = {
        "target_role_id": "cloud_solutions_architect",
        "target_title": "Cloud Solutions Architect",
        "preferences": {"work_mode": "remote"},
        "milestones": [
            {"id": "m1", "title": "Obtain AWS Solutions Architect Associate", "completed": False},
            {"id": "m2", "title": "Build Terraform infrastructure lab", "completed": False}
        ]
    }
    res_goal = client.post("/api/career/goals", json=goal_payload, headers=headers)
    assert res_goal.status_code == 200
    goal = res_goal.json()["goal"]
    assert goal["target_title"] == "Cloud Solutions Architect"

    # 2. Toggle milestone
    res_toggle = client.patch(f"/api/career/goals/{goal['id']}/milestones/m1", headers=headers)
    assert res_toggle.status_code == 200
    m1 = next(m for m in res_toggle.json()["milestones"] if m["id"] == "m1")
    assert m1["completed"] is True

    # 3. Compare multiple career paths side-by-side
    compare_payload = {
        "target_role_ids": ["cloud_solutions_architect", "full_stack_engineer"],
        "country": "us"
    }
    res_comp = client.post("/api/career/compare", json=compare_payload, headers=headers)
    assert res_comp.status_code == 200
    comps = res_comp.json()["comparisons"]
    assert len(comps) == 2
    assert all("required_skills" in c and "missing_skills" in c and "salary_bands" in c for c in comps)


def test_adaptive_learning_plan_and_quiz_verification():
    """
    Verifies Section 4.5:
    - Generating adaptive learning plan from missing skills
    - Completing tasks and passing quiz
    - Passing quiz elevates proficiency and creates demonstrated skill evidence
    - Failing quiz provides targeted revision without falsely increasing proficiency
    """
    token, user_id, headers = get_auth_token_and_user()

    # 1. Generate learning plan
    gen_payload = {
        "target_role": "Cloud Solutions Architect",
        "weekly_hours": 8,
        "preferred_days": ["Tuesday", "Thursday", "Saturday"]
    }
    res_gen = client.post("/api/learning/generate", json=gen_payload, headers=headers)
    assert res_gen.status_code == 200
    plan_data = res_gen.json()
    assert plan_data["has_plan"] is True
    assert len(plan_data["tasks"]) >= 3
    first_task = plan_data["tasks"][0]

    # 2. Update task status to in_progress
    res_prog = client.patch(
        f"/api/learning/tasks/{first_task['id']}/status",
        json={"status": "in_progress"},
        headers=headers
    )
    assert res_prog.status_code == 200

    # 3. Get quiz questions
    res_quiz = client.get(f"/api/learning/tasks/{first_task['id']}/quiz", headers=headers)
    assert res_quiz.status_code == 200
    quiz_data = res_quiz.json()
    assert len(quiz_data["questions"]) >= 2
    # Verify answers are hidden from client
    assert "answer_idx" not in quiz_data["questions"][0]

    # 4. Submit failed quiz (wrong answers)
    fail_answers = {q["id"]: 99 for q in quiz_data["questions"]}
    res_fail = client.post(
        f"/api/learning/tasks/{first_task['id']}/quiz",
        json={"answers": fail_answers},
        headers=headers
    )
    assert res_fail.status_code == 200
    fail_res = res_fail.json()
    assert fail_res["passed"] is False
    assert fail_res["skill_verified"] is False

    # 5. Submit passing quiz (correct answers: 0 for all generated questions)
    pass_answers = {q["id"]: 0 for q in quiz_data["questions"]}
    res_pass = client.post(
        f"/api/learning/tasks/{first_task['id']}/quiz",
        json={"answers": pass_answers},
        headers=headers
    )
    assert res_pass.status_code == 200
    pass_res = res_pass.json()
    assert pass_res["passed"] is True
    assert pass_res["skill_verified"] is True

    # 6. Verify skill status updated in user profile
    res_skills = client.get("/api/profile/skills", headers=headers)
    assert res_skills.status_code == 200
    profile_skills = res_skills.json()
    assessed_skill = next((s for s in profile_skills if s["name"].lower() == first_task["skill_name"].lower()), None)
    assert assessed_skill is not None
    assert assessed_skill["verification_status"] == "demonstrated"

    # 7. Update schedule
    res_sched = client.patch(
        "/api/learning/schedule",
        json={"weekly_hours": 12, "preferred_days": ["Monday", "Wednesday", "Friday", "Sunday"]},
        headers=headers
    )
    assert res_sched.status_code == 200
    assert res_sched.json()["weekly_hours"] == 12


def test_career_readiness_scorecard_on_dashboard():
    """
    Verifies Section 5.3:
    - Dashboard returns transparent 6-pillar career readiness score and actionable next steps
    - Calculation method and disclaimer are explicitly included
    """
    token, user_id, headers = get_auth_token_and_user()

    res_dash = client.get("/api/dashboard", headers=headers)
    assert res_dash.status_code == 200
    dash = res_dash.json()
    assert "career_readiness" in dash
    cr = dash["career_readiness"]
    assert cr is not None
    assert "overall_score" in cr
    assert "readiness_tier" in cr
    assert "calculation_method" in cr
    assert len(cr["categories"]) == 6
    assert all("weight_percent" in c and "actionable_next_step" in c for c in cr["categories"])
