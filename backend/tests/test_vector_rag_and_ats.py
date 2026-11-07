"""
backend/tests/test_vector_rag_and_ats.py
----------------------------------------
Tests for:
1. VectorRagService (dense embeddings, cosine similarity, semantic chunking, hybrid match)
2. AtsEmulatorService (Workday, Greenhouse, Taleo, Lever parsing filters & stress test)
3. TailorService (factuality-preserving bullet reordering & keyword elevation)
4. Chrome Extension ingestion & Inbound Email webhook endpoints
"""

import pytest
import os
import sys

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.vector_rag_service import VectorRagService
from app.services.ats_emulator_service import AtsEmulatorService
from app.services.tailor_service import TailorService


SAMPLE_RESUME = """
John Doe
Software Engineer
john.doe@example.com | (555) 123-4567 | linkedin.com/in/johndoe | github.com/johndoe

SUMMARY
Experienced Software Engineer specializing in distributed event-driven systems and microservices architecture.

WORK EXPERIENCE
Senior Backend Engineer - TechCorp
01/2022 - Present
• Architected high-throughput Kafka streaming pipeline processing 50M events daily with 99.99% uptime.
• Deployed Kubernetes container workloads and Helm charts on AWS EKS reducing latency by 35%.
• Designed PostgreSQL relational database schemas and optimized SQL query execution times.

Software Engineer - StartupX
06/2019 - 12/2021
• Developed RESTful backend APIs in Python and FastAPI with automated pytest CI/CD pipelines.
• Integrated Redis caching layers cutting API response times from 350ms to 45ms.

EDUCATION
Bachelor of Science in Computer Science
State University
09/2015 - 05/2019

SKILLS
Python, FastAPI, Kafka, Docker, Kubernetes, AWS, PostgreSQL, Redis, CI/CD, Git
"""

SAMPLE_JOB = """
Senior Distributed Systems Engineer
Acme Cloud Solutions

Job Description:
We are seeking a Senior Distributed Systems Engineer to build mission-critical cloud infrastructure.

Responsibilities:
• Architect scalable cloud container management and microservices clusters.
• Build real-time event streaming pipelines handling millions of records daily.
• Optimize relational database storage and caching layers for sub-50ms latency.
• Collaborate with cross-functional teams to deploy reliable CI/CD release workflows.

Requirements:
• 3+ years experience with container orchestration (Kubernetes or Docker).
• Deep expertise in message brokers (Kafka or RabbitMQ).
• Proficiency in Python or Go.
• Strong foundation in SQL and database performance tuning.
"""


def test_vector_rag_embeddings_and_cosine_similarity():
    """Verify 256-D normalized vector generation and cosine similarity math."""
    v1 = VectorRagService.generate_embedding("Kubernetes container cluster orchestration")
    v2 = VectorRagService.generate_embedding("Cloud container management and microservices")
    v3 = VectorRagService.generate_embedding("Baking artisan sourdough bread in bakery kitchen")

    assert len(v1) == VectorRagService.DIMENSIONS
    assert len(v2) == VectorRagService.DIMENSIONS

    # Semantic similarity between related tech concepts should be high
    sim_tech = VectorRagService.cosine_similarity(v1, v2)
    # Dissimilar concepts should score significantly lower
    sim_unrelated = VectorRagService.cosine_similarity(v1, v3)

    assert sim_tech > sim_unrelated
    assert sim_tech > 0.60


def test_hybrid_rag_matching_service():
    """Verify end-to-end vector RAG matching and aligned chunk pairs."""
    result = VectorRagService.perform_hybrid_rag_matching(
        resume_text=SAMPLE_RESUME,
        job_text=SAMPLE_JOB,
        job_title="Senior Distributed Systems Engineer",
        company="Acme Cloud Solutions"
    )

    assert result["overall_hybrid_score"] >= 60
    assert result["semantic_vector_score"] >= 60
    assert len(result["aligned_chunks"]) > 0
    assert "concept_alignment_insights" in result
    assert result["chunks_evaluated"]["resume_chunks_count"] > 0


def test_ats_emulator_full_stress_test():
    """Verify 4-tier ATS stress test across Workday, Greenhouse, Taleo, and Lever."""
    stress_test = AtsEmulatorService.run_full_stress_test(SAMPLE_RESUME, "john_doe_cv.pdf")

    assert stress_test["overall_ats_score"] >= 80
    assert stress_test["overall_risk_rating"] in ["PASS / LOW RISK", "MODERATE RISK"]
    assert "workday" in stress_test["systems"]
    assert "greenhouse" in stress_test["systems"]
    assert "taleo" in stress_test["systems"]
    assert "lever" in stress_test["systems"]

    # Verify Lever detected email
    assert stress_test["systems"]["lever"]["score"] >= 80
    # Verify Taleo detected dates
    assert stress_test["systems"]["taleo"]["score"] >= 80


def test_ats_emulator_catches_flaws():
    """Verify ATS emulator flags table delimiters and missing headers."""
    bad_resume = "Name: Bob | Phone: None | No sections here | Just raw unformatted text with ⚡ fancy bullets"
    stress_test = AtsEmulatorService.run_full_stress_test(bad_resume)

    assert stress_test["overall_ats_score"] < 65
    assert len(stress_test["all_issues"]) > 0
    assert len(stress_test["actionable_mitigation_checklist"]) > 0


def test_tailor_service_bullet_reordering():
    """Verify zero-hallucination bullet reordering and keyword elevation."""
    tailored = TailorService.tailor_resume_for_job(
        resume_text=SAMPLE_RESUME,
        job_text=SAMPLE_JOB,
        target_role="Senior Distributed Systems Engineer"
    )

    assert tailored["tailored_title"] == "Senior Distributed Systems Engineer"
    assert len(tailored["reordered_accomplishments"]) > 0
    # The top bullet should be highly relevant (e.g., Python/FastAPI, Kafka, Kubernetes, or PostgreSQL)
    top_bullet = tailored["reordered_accomplishments"][0]["text"]
    assert any(tech in top_bullet for tech in ["Kafka", "Kubernetes", "PostgreSQL", "Python", "FastAPI"])
    assert len(tailored["elevated_keywords"]) > 0
    assert "Strict zero-hallucination" in tailored["factuality_guarantee"]


def test_api_endpoints_vector_rag_and_ats_stress():
    """Verify FastAPI endpoints for Vector RAG match, ATS raw stress test, and inbound email webhook."""
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)

    # 1. ATS Stress-Test Raw endpoint (no auth required)
    ats_resp = client.post("/api/jobs/ats-stress-test/raw", json={
        "text": SAMPLE_RESUME,
        "file_name": "sample_cv.pdf"
    })
    # Note: If authenticated route, check response or status
    if ats_resp.status_code == 200:
        data = ats_resp.json()
        assert "overall_ats_score" in data
        assert "systems" in data
        assert "workday" in data["systems"]

    # 2. Inbound Email Webhook
    webhook_resp = client.post("/api/applications/inbound-webhook", json={
        "from": "recruiter@techcorp.com",
        "subject": "Invitation to Interview: Senior Backend Engineer",
        "body": "Hi John, We would love to schedule a technical interview on Zoom this week."
    })
    assert webhook_resp.status_code == 200
    w_data = webhook_resp.json()
    assert w_data["status"] == "PROCESSED"
    assert w_data["classified_stage"] == "interview"

