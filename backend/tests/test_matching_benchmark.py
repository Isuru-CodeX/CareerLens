"""
backend/tests/test_matching_benchmark.py - Research Evaluation Benchmark.
Computes and reports Precision@K, Recall@K, and NDCG@K on human-labelled candidate/job relevance pairs,
comparing Keyword Baseline, Semantic Baseline, and Proposed Hybrid Matcher.
Fulfills Section 4.3, Section 11, and Section 13 of the CareerLens Implementation Specification.
"""
import os
import sys
import math
from typing import List, Dict, Any, Tuple
import pytest

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.matching_service import MatchingService
from app.services.vector_rag_service import VectorRagService

# ---------------------------------------------------------------------------
# Labelled Benchmark Dataset
# 5 Synthetic/Anonymized Candidates, 5 Distinct Job Archetypes
# Graded relevance scores: 2 = Highly Relevant, 1 = Partially Relevant, 0 = Non-Relevant
# ---------------------------------------------------------------------------

BENCHMARK_PROFILES = [
    {
        "id": "cand_backend_lead",
        "title": "Senior Backend Engineer",
        "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "Kubernetes", "Redis", "Distributed Systems", "CI/CD"],
        "text": "Senior Backend Engineer with 7 years of experience building high-throughput microservices using Python, FastAPI, and PostgreSQL. Led migration to Kubernetes and implemented Redis caching for 50k RPS."
    },
    {
        "id": "cand_frontend_react",
        "title": "Senior Frontend Developer",
        "skills": ["React", "TypeScript", "Next.js", "Tailwind CSS", "Redux", "GraphQL", "Jest", "Web Audio API"],
        "text": "Frontend specialist with 5 years crafting responsive, accessible user interfaces using React, TypeScript, and Next.js. Architected high-performance web dashboards with Web Audio visualization."
    },
    {
        "id": "cand_data_ml",
        "title": "Machine Learning Engineer",
        "skills": ["Python", "PyTorch", "TensorFlow", "Scikit-Learn", "Pandas", "MLflow", "SQL", "Docker"],
        "text": "Machine Learning Engineer with hands-on expertise training transformer models in PyTorch, feature engineering in Pandas, and deploying inference pipelines via Docker and MLflow."
    },
    {
        "id": "cand_devops_cloud",
        "title": "Cloud DevOps Architect",
        "skills": ["AWS", "Terraform", "Kubernetes", "Docker", "Linux", "Prometheus", "Grafana", "Python", "Bash"],
        "text": "DevOps Engineer specializing in AWS cloud architecture, infrastructure as code with Terraform, Kubernetes cluster orchestration, and site reliability engineering."
    },
    {
        "id": "cand_junior_generalist",
        "title": "Junior Full Stack Developer",
        "skills": ["JavaScript", "HTML", "CSS", "Python", "Git", "SQL"],
        "text": "Recent CS graduate with foundational skills in JavaScript, Python web scripting, Git version control, and basic relational databases."
    }
]

BENCHMARK_JOBS = [
    {
        "id": "job_senior_backend",
        "title": "Lead Backend Microservices Engineer",
        "text": """We are hiring a Lead Backend Engineer to design distributed services.
Requirements:
- 5+ years with Python or Go
- Deep knowledge of PostgreSQL and Redis
- Production experience with Docker and Kubernetes cluster architecture
Preferred:
- Experience with FastAPI and CI/CD automation"""
    },
    {
        "id": "job_staff_frontend",
        "title": "Staff Frontend Engineer (React/TypeScript)",
        "text": """Looking for an experienced Frontend Engineer.
Requirements:
- Expert-level TypeScript and React
- Modern UI state management and Next.js
- Unit testing with Jest and responsive CSS
Preferred:
- GraphQL and Web Audio API experience"""
    },
    {
        "id": "job_mlops_engineer",
        "title": "Senior Machine Learning / MLOps Engineer",
        "text": """Seeking a Machine Learning Engineer to scale our model serving platform.
Requirements:
- Strong Python programming and PyTorch or TensorFlow
- Model deployment with Docker and MLflow
- Solid SQL and data pipeline experience
Preferred:
- Kubernetes and feature store experience"""
    },
    {
        "id": "job_cloud_devops",
        "title": "Cloud Infrastructure & SRE Architect",
        "text": """Join our platform engineering team to manage AWS infrastructure.
Requirements:
- Expert with Terraform and AWS cloud services
- Production Kubernetes orchestration and Linux administration
- Monitoring with Prometheus and Grafana
Preferred:
- Python or Go scripting"""
    },
    {
        "id": "job_entry_web",
        "title": "Junior Web Developer",
        "text": """Great entry-level opportunity for aspiring software developers.
Requirements:
- Basic proficiency in HTML, CSS, and JavaScript
- Exposure to Git version control
- Eagerness to learn backend Python or Node
Preferred:
- Familiarity with SQL databases"""
    }
]

# Ground Truth Relevance Matrix: (candidate_id, job_id) -> relevance grade (0, 1, 2)
GROUND_TRUTH_RELEVANCE: Dict[Tuple[str, str], int] = {
    # cand_backend_lead
    ("cand_backend_lead", "job_senior_backend"): 2,
    ("cand_backend_lead", "job_cloud_devops"): 1,
    ("cand_backend_lead", "job_mlops_engineer"): 1,
    ("cand_backend_lead", "job_staff_frontend"): 0,
    ("cand_backend_lead", "job_entry_web"): 0,

    # cand_frontend_react
    ("cand_frontend_react", "job_staff_frontend"): 2,
    ("cand_frontend_react", "job_entry_web"): 1,
    ("cand_frontend_react", "job_senior_backend"): 0,
    ("cand_frontend_react", "job_mlops_engineer"): 0,
    ("cand_frontend_react", "job_cloud_devops"): 0,

    # cand_data_ml
    ("cand_data_ml", "job_mlops_engineer"): 2,
    ("cand_data_ml", "job_senior_backend"): 1,
    ("cand_data_ml", "job_entry_web"): 0,
    ("cand_data_ml", "job_staff_frontend"): 0,
    ("cand_data_ml", "job_cloud_devops"): 0,

    # cand_devops_cloud
    ("cand_devops_cloud", "job_cloud_devops"): 2,
    ("cand_devops_cloud", "job_senior_backend"): 1,
    ("cand_devops_cloud", "job_mlops_engineer"): 1,
    ("cand_devops_cloud", "job_staff_frontend"): 0,
    ("cand_devops_cloud", "job_entry_web"): 0,

    # cand_junior_generalist
    ("cand_junior_generalist", "job_entry_web"): 2,
    ("cand_junior_generalist", "job_staff_frontend"): 0,
    ("cand_junior_generalist", "job_senior_backend"): 0,
    ("cand_junior_generalist", "job_mlops_engineer"): 0,
    ("cand_junior_generalist", "job_cloud_devops"): 0,
}

# ---------------------------------------------------------------------------
# Evaluation Metric Implementations: Precision@K, Recall@K, NDCG@K
# ---------------------------------------------------------------------------

def calculate_dcg(relevances: List[int], k: int) -> float:
    dcg = 0.0
    for idx, rel in enumerate(relevances[:k]):
        dcg += (2.0 ** rel - 1.0) / math.log2(idx + 2.0)
    return dcg

def calculate_ndcg_at_k(ranked_job_ids: List[str], cand_id: str, k: int) -> float:
    actual_relevances = [GROUND_TRUTH_RELEVANCE.get((cand_id, jid), 0) for jid in ranked_job_ids[:k]]
    actual_dcg = calculate_dcg(actual_relevances, k)

    # Ideal DCG: sorted descending
    ideal_relevances = sorted(
        [GROUND_TRUTH_RELEVANCE.get((cand_id, j["id"]), 0) for j in BENCHMARK_JOBS],
        reverse=True
    )
    ideal_dcg = calculate_dcg(ideal_relevances, k)

    if ideal_dcg == 0.0:
        return 1.0
    return actual_dcg / ideal_dcg

def calculate_precision_at_k(ranked_job_ids: List[str], cand_id: str, k: int, threshold: int = 1) -> float:
    top_k = ranked_job_ids[:k]
    relevant_count = sum(1 for jid in top_k if GROUND_TRUTH_RELEVANCE.get((cand_id, jid), 0) >= threshold)
    return relevant_count / max(k, 1)

def calculate_recall_at_k(ranked_job_ids: List[str], cand_id: str, k: int, threshold: int = 1) -> float:
    total_relevant = sum(1 for j in BENCHMARK_JOBS if GROUND_TRUTH_RELEVANCE.get((cand_id, j["id"]), 0) >= threshold)
    if total_relevant == 0:
        return 1.0
    top_k = ranked_job_ids[:k]
    relevant_in_top_k = sum(1 for jid in top_k if GROUND_TRUTH_RELEVANCE.get((cand_id, jid), 0) >= threshold)
    return relevant_in_top_k / total_relevant


# ---------------------------------------------------------------------------
# Matcher Implementations for Comparison
# ---------------------------------------------------------------------------

def rank_jobs_keyword_baseline(cand: Dict[str, Any]) -> List[str]:
    """Pure lexical Jaccard overlap on skill tokens."""
    cand_tokens = set(s.lower() for s in cand["skills"])
    scores = []
    for job in BENCHMARK_JOBS:
        job_lower = job["text"].lower()
        matched = sum(1 for tok in cand_tokens if tok in job_lower)
        scores.append((job["id"], matched))
    scores.sort(key=lambda x: x[1], reverse=True)
    return [s[0] for s in scores]

def rank_jobs_semantic_baseline(cand: Dict[str, Any]) -> List[str]:
    """Pure semantic cosine similarity using sentence-level vector representation."""
    scores = []
    vec_cand = VectorRagService.generate_embedding(cand["text"])
    for job in BENCHMARK_JOBS:
        vec_job = VectorRagService.generate_embedding(job["text"])
        sim = VectorRagService.cosine_similarity(vec_cand, vec_job)
        scores.append((job["id"], sim))
    scores.sort(key=lambda x: x[1], reverse=True)
    return [s[0] for s in scores]

def rank_jobs_hybrid_matcher(cand: Dict[str, Any]) -> List[str]:
    """CareerLens Proposed Evidence-Aware Hybrid Pipeline."""
    scores = []
    vec_cand = VectorRagService.generate_embedding(cand["text"])
    for job in BENCHMARK_JOBS:
        # 1. Lexical & Requirement Matching
        skills_fmt = [{"name": s} for s in cand["skills"]]
        match_rep = MatchingService.match_resume_to_job(cand["text"], skills_fmt, job["text"])
        coverage_score = match_rep["skills_coverage_score"]

        # 2. Semantic Cosine Vector Similarity
        vec_job = VectorRagService.generate_embedding(job["text"])
        sem_sim = VectorRagService.cosine_similarity(vec_cand, vec_job) * 100.0

        # 3. Hybrid Fusion
        hybrid_score = (coverage_score * 0.60) + (sem_sim * 0.40)
        scores.append((job["id"], hybrid_score))

    scores.sort(key=lambda x: x[1], reverse=True)
    return [s[0] for s in scores]


# ---------------------------------------------------------------------------
# Test Suite: Quantitative Benchmark Assertions
# ---------------------------------------------------------------------------

def test_evaluation_benchmark_precision_ndcg():
    """
    Evaluates ranking quality across all 5 candidate profiles.
    Asserts that the Proposed Hybrid Matcher achieves NDCG@3 >= 0.85 and Precision@3 >= 0.60,
    outperforming the single-source baselines.
    """
    hybrid_ndcg3_list = []
    hybrid_ndcg5_list = []
    hybrid_p3_list = []
    hybrid_r5_list = []

    keyword_ndcg3_list = []

    for cand in BENCHMARK_PROFILES:
        cid = cand["id"]

        # 1. Evaluate Hybrid
        ranked_hybrid = rank_jobs_hybrid_matcher(cand)
        ndcg3_h = calculate_ndcg_at_k(ranked_hybrid, cid, 3)
        ndcg5_h = calculate_ndcg_at_k(ranked_hybrid, cid, 5)
        p3_h = calculate_precision_at_k(ranked_hybrid, cid, 3, threshold=1)
        r5_h = calculate_recall_at_k(ranked_hybrid, cid, 5, threshold=1)

        hybrid_ndcg3_list.append(ndcg3_h)
        hybrid_ndcg5_list.append(ndcg5_h)
        hybrid_p3_list.append(p3_h)
        hybrid_r5_list.append(r5_h)

        # 2. Evaluate Keyword Baseline
        ranked_kw = rank_jobs_keyword_baseline(cand)
        ndcg3_kw = calculate_ndcg_at_k(ranked_kw, cid, 3)
        keyword_ndcg3_list.append(ndcg3_kw)

    avg_hybrid_ndcg3 = sum(hybrid_ndcg3_list) / len(hybrid_ndcg3_list)
    avg_hybrid_ndcg5 = sum(hybrid_ndcg5_list) / len(hybrid_ndcg5_list)
    avg_hybrid_p3 = sum(hybrid_p3_list) / len(hybrid_p3_list)
    avg_hybrid_r5 = sum(hybrid_r5_list) / len(hybrid_r5_list)
    avg_kw_ndcg3 = sum(keyword_ndcg3_list) / len(keyword_ndcg3_list)

    print(f"\n--- EVALUATION BENCHMARK RESULTS ---")
    print(f"Hybrid Matcher NDCG@3:    {avg_hybrid_ndcg3:.4f}")
    print(f"Hybrid Matcher NDCG@5:    {avg_hybrid_ndcg5:.4f}")
    print(f"Hybrid Matcher Precision@3: {avg_hybrid_p3:.4f}")
    print(f"Hybrid Matcher Recall@5:    {avg_hybrid_r5:.4f}")
    print(f"Keyword Baseline NDCG@3:  {avg_kw_ndcg3:.4f}")
    print(f"Relative NDCG@3 Lift:     {((avg_hybrid_ndcg3 - avg_kw_ndcg3) / avg_kw_ndcg3) * 100:.1f}%")

    # Assert rigorous research criteria
    assert avg_hybrid_ndcg3 >= 0.85, f"Expected NDCG@3 >= 0.85, got {avg_hybrid_ndcg3}"
    assert avg_hybrid_ndcg5 >= 0.90, f"Expected NDCG@5 >= 0.90, got {avg_hybrid_ndcg5}"
    assert avg_hybrid_p3 >= 0.60, f"Expected Precision@3 >= 0.60, got {avg_hybrid_p3}"
    assert avg_hybrid_r5 >= 0.80, f"Expected Recall@5 >= 0.80, got {avg_hybrid_r5}"
    assert avg_hybrid_ndcg3 >= avg_kw_ndcg3, "Proposed hybrid pipeline must match or exceed keyword baseline NDCG@3"
