"""
backend/tests/test_coding_sandbox_enhanced.py
---------------------------------------------
Tests for Module 11 Enhanced: In-Browser Live Coding & System Design Assessment Sandbox.
Verifies:
1. Multi-role challenge catalogs (Frontend, Backend, Fullstack, Architect, DevOps, AppSec, Data/ML).
2. Track and difficulty filtering.
3. Automated error detection, actionable corrections, and missed edge-case auditing.
4. Multi-dimensional rubric scoring (Correctness, Scalability, Quality, Reliability).
5. Delivery of official benchmark Model Answers and Reference Architectures.
"""

import pytest
import os
import sys
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.coding_challenge_service import CodingChallengeService


def test_supported_roles_metadata():
    """Verify that multiple engineering roles are supported with active challenges."""
    roles = CodingChallengeService.get_roles()
    assert len(roles) >= 6
    role_ids = [r["id"] for r in roles]
    assert "frontend" in role_ids
    assert "backend" in role_ids
    assert "architect" in role_ids
    assert "devops" in role_ids
    assert "appsec" in role_ids
    assert "data_ml" in role_ids

    for r in roles:
        assert r["challenge_count"] > 0
        assert "icon" in r
        assert "description" in r


def test_challenge_filtering_by_role_and_track():
    """Verify filtering challenges by role and track (coding vs system_design)."""
    frontend_coding = CodingChallengeService.get_all_challenges(role="frontend", track="coding")
    assert len(frontend_coding) >= 1
    assert all(c["track"] == "coding" for c in frontend_coding)
    assert any("virtualized" in c["id"] for c in frontend_coding)

    backend_design = CodingChallengeService.get_all_challenges(role="backend", track="system_design")
    assert len(backend_design) >= 1
    assert all(c["track"] == "system_design" for c in backend_design)
    assert any("payment" in c["id"] for c in backend_design)

    architect_all = CodingChallengeService.get_all_challenges(role="architect")
    assert len(architect_all) >= 2

    data_all = CodingChallengeService.get_all_challenges(role="data_ml")
    assert len(data_all) >= 2


def test_error_detection_and_corrections_in_rate_limiter():
    """Verify that unsynchronized/race-condition code triggers errors and actionable fixes."""
    flawed_code = """class TokenBucketRateLimiter:
    def __init__(self, capacity, refill_rate):
        self.capacity = capacity
        self.tokens = capacity
    def allow_request(self, timestamp, tokens=1):
        # Flawed: No lock, negative refill risk, no clock drift defense
        self.tokens -= tokens
        return True, self.tokens
"""
    res = asyncio.run(CodingChallengeService.evaluate_submission(
        challenge_id="be_distributed_rate_limiter",
        code=flawed_code,
        language="python"
    ))

    assert res["success"] is True
    assert "overall_score" in res
    assert "grade" in res
    assert len(res["errors_found"]) > 0

    # Verify race condition or unsynchronized state error was detected
    err_text = " ".join([e["error"] + " " + e["explanation"] for e in res["errors_found"]]).lower()
    assert "race condition" in err_text or "lock" in err_text or "state" in err_text

    # Verify actionable corrections with code snippets are provided
    assert len(res["corrections"]) > 0
    assert any("lock" in c["fix"].lower() for c in res["corrections"])

    # Verify model answer is included
    assert "model_answer" in res
    assert "solution_code" in res["model_answer"]
    assert "TokenBucketRateLimiter" in res["model_answer"]["solution_code"]


def test_missed_important_things_in_virtualized_window():
    """Verify that omitting rubber-banding scroll clamping triggers missed edge case warning."""
    code_without_clamping = """class VirtualizedListCalculator:
    def __init__(self, total_items, item_height, container_height, overscan=2):
        self.total_items = total_items
        self.item_height = item_height
        self.container_height = container_height
        self.overscan = overscan
    def calculate_window(self, scroll_top):
        start = scroll_top // self.item_height
        end = start + 5
        return {'start_index': start, 'end_index': end, 'total_height': 1000, 'offset_y': 0}
"""
    res = asyncio.run(CodingChallengeService.evaluate_submission(
        challenge_id="fe_virtualized_window",
        code=code_without_clamping,
        language="python"
    ))

    assert res["success"] is True
    # Verify missed important things are highlighted
    assert len(res["missed_important_things"]) > 0
    missed_items = " ".join([m["item"] + " " + m["why_important"] for m in res["missed_important_things"]]).lower()
    assert "scroll" in missed_items or "clamping" in missed_items or "dataset" in missed_items

    # Verify 4-dimensional rubric scores
    rubric = res["rubric_breakdown"]
    assert "correctness" in rubric
    assert "scalability_complexity" in rubric
    assert "code_quality_architecture" in rubric
    assert "reliability_security" in rubric


def test_system_design_model_answer_delivery():
    """Verify delivery of system design reference architecture and trade-off analysis."""
    design_submission = """# URL Shortener Architecture
Using Redis for cache, PostgreSQL for persistent storage, and Base62 IDs.
Load balancer routes requests across 5 API instances.
"""
    res = asyncio.run(CodingChallengeService.evaluate_submission(
        challenge_id="sa_global_url_shortener",
        code=design_submission,
        language="markdown"
    ))

    assert res["success"] is True
    assert res["track"] == "system_design"
    assert "model_answer" in res
    model_doc = res["model_answer"].get("architecture_doc", "")
    assert "URL Shortener" in model_doc
    assert "Base62" in model_doc
    assert "Capacity" in model_doc or "QPS" in model_doc
    assert len(res["model_answer"].get("design_principles", [])) > 0
