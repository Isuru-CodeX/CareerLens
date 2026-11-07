"""
backend/tests/test_major_project_modules.py
--------------------------------------------
Unit and integration tests for Next-Level Deep-Tech Modules:
1. Module 7: Explainable AI (XAI) & Algorithmic Bias / Fairness Auditor
2. Module 10: GitHub & Technical Artifact "Proof of Work" Verifier
3. Module 11: In-Browser Live Coding & System Design Assessment Sandbox
4. Module 12: University Placement Cell & Multi-Tenant Career Services Portal
"""

import pytest
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.xai_bias_service import XaiBiasService
from app.services.github_verifier_service import GithubVerifierService
from app.services.coding_challenge_service import CodingChallengeService
from app.services.placement_service import PlacementService


SAMPLE_RESUME = """
Jane Doe
Senior Backend Engineer
jane.doe@example.com | (555) 987-6543 | San Francisco, CA 94105

PROFESSIONAL SUMMARY
Experienced software engineer with deep expertise in distributed event-driven microservices.

WORK EXPERIENCE
Senior Backend Engineer - TechCorp (2021 - Present)
• Built high-throughput FastAPI microservices processing 45M requests daily with 99.99% SLA.
• Optimized PostgreSQL query execution plans reducing p99 latency by 40%.
• Responsible for assisting with unit test migrations and general codebase maintenance.

EDUCATION
Bachelor of Science in Computer Science - State University (Graduated 2018)

SKILLS
Python, FastAPI, PostgreSQL, Docker, Kubernetes, Redis, React
"""

SAMPLE_JOB = """
Senior Distributed Systems Engineer
Seeking an experienced engineer to scale our cloud-native event streaming infrastructure.
Must have strong expertise in Python, FastAPI, Docker, and PostgreSQL.
Looking for someone who can drive high-impact architecture and deliver resilient systems.
"""

BIASED_JOB = """
Rockstar Software Ninja Wanted!
We are an aggressive, powerhouse startup seeking a young and energetic digital native.
Candidates must be recent graduates only with top-tier university degrees.
Must be ready to crush competition and dominate the market with a relentless work ethic.
"""


def test_xai_shap_attributions():
    """Verify token/sentence-level Shapley value attributions and delta scores."""
    res = XaiBiasService.calculate_shap_attributions(
        resume_text=SAMPLE_RESUME,
        job_text=SAMPLE_JOB,
        baseline_score=75.0
    )

    assert "calibrated_score" in res
    assert res["total_segments_analyzed"] > 0
    assert res["positive_impact_count"] >= 1
    # Check that high-impact bullet with metric received positive delta
    high_impact = [a for a in res["attributions"] if "45M" in a["text"]]
    assert len(high_impact) > 0
    assert high_impact[0]["category"] == "positive"
    assert high_impact[0]["shap_delta"] > 0


def test_unconscious_bias_and_fairness_scanner():
    """Verify detection of masculine-coded jargon, ageism, and elitism."""
    res = XaiBiasService.scan_unconscious_bias(BIASED_JOB)

    assert res["fairness_score"] < 70
    assert res["bias_risk_level"] in ["MODERATE", "HIGH"]
    terms_found = [f["term"].lower() for f in res["findings"]]
    assert any("rockstar" in t for t in terms_found)
    assert any("ninja" in t for t in terms_found)
    assert any("young and energetic" in t for t in terms_found)
    assert any("recent graduate" in t for t in terms_found)


def test_blind_recruitment_masking():
    """Verify automated redaction of PII, gender pronouns, and graduation years."""
    res = XaiBiasService.generate_blind_recruitment_profile(
        resume_text=SAMPLE_RESUME,
        candidate_name="Jane Doe",
        email="jane.doe@example.com",
        phone="(555) 987-6543"
    )

    masked = res["masked_text"]
    assert "Jane" not in masked
    assert "Doe" not in masked
    assert "jane.doe@example.com" not in masked
    assert "(555) 987-6543" not in masked
    assert "[VERIFIED_CONTACT_MASKED]" in masked
    assert "[PHONE_REDACTED]" in masked
    assert "[YEAR_MASKED]" in masked  # Graduation year 2018 masked


def test_github_verifier_claim_to_code_and_crypto_badge():
    """Verify GitHub audit, claim-to-code matching, and SHA-256 badge."""
    res = GithubVerifierService.audit_github_profile(
        username="janedoe",
        claimed_skills=["Python", "FastAPI", "Docker", "PostgreSQL", "Solidity"],
        candidate_id="user_test_123"
    )

    assert res["success"] is True
    assert res["github_username"] == "janedoe"
    assert len(res["verified_skills"]) > 0
    # Python & FastAPI should be verified via synthetic sample repositories
    verified_names = [v["skill"].lower() for v in res["verified_skills"]]
    assert "python" in verified_names
    assert "proof_of_work_badge" in res
    badge = res["proof_of_work_badge"]
    assert len(badge["cryptographic_hash"]) == 64  # Valid SHA-256 hex string


def test_coding_challenge_catalog_and_evaluation():
    """Verify challenge listing and algorithmic Big-O complexity evaluation."""
    challenges = CodingChallengeService.get_all_challenges()
    assert len(challenges) >= 3

    # Test two-sum evaluation
    res = CodingChallengeService.evaluate_code(
        challenge_id="challenge_two_sum_optimized",
        code="""def two_sum(nums, target):
    lookup = {}
    for i, n in enumerate(nums):
        diff = target - n
        if diff in lookup:
            return [lookup[diff], i]
        lookup[n] = i
    return []
""",
        language="python"
    )

    assert res["success"] is True
    assert res["code_quality_score"] >= 80
    assert "O(1)" in res["estimated_complexity"] or "O(N)" in res["estimated_complexity"]


def test_placement_cohort_telemetry_and_export():
    """Verify university placement batch metrics and CSV roster generator."""
    telemetry = PlacementService.get_cohort_telemetry(batch="Class of 2026")

    assert telemetry["total_students"] > 0
    assert telemetry["average_ats_readiness"] > 70
    assert len(telemetry["skill_deficit_alerts"]) >= 3
    # Verify critical cloud deficit alert is present
    cloud_alert = [a for a in telemetry["skill_deficit_alerts"] if "Kubernetes" in a["skill"]]
    assert len(cloud_alert) > 0

    csv_data = PlacementService.export_csv(batch="Class of 2026")
    assert "Student ID,Name,Email,Degree" in csv_data
    assert "Aarav Sharma" in csv_data

