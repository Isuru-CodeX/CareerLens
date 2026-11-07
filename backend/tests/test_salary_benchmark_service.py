"""
backend/tests/test_salary_benchmark_service.py - Unit test suite for verified salary benchmark service.
Tests:
1. Salary band monotonicity (base <= p25 <= median <= p75 <= top) via _enforce_band_order
2. Multi-industry role benchmark retrieval (tech, healthcare, finance, education, legal, marketing)
3. Currency conversion integrity
4. Cache retrieval
"""
import os
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.salary_service import SalaryService, CURRENCY_RATES, OFFICIAL_BENCHMARK_DATABASE


def test_salary_band_enforcement():
    # Valid monotonic band
    base, p25, median, p75, top = SalaryService._enforce_band_order(50000, 65000, 80000, 100000, 130000)
    assert base <= p25 <= median <= p75 <= top

    # Non-monotonic inputs should be normalized to strictly monotonic
    base, p25, median, p75, top = SalaryService._enforce_band_order(100000, 80000, 70000, 60000, 50000)
    assert base <= p25 <= median <= p75 <= top


def test_multi_industry_benchmarks():
    industries = ["tech", "healthcare", "finance", "education", "legal", "marketing"]
    for ind in industries:
        res = SalaryService.get_verified_benchmark("General Role", industry_id=ind)
        assert res["industry"] == ind
        assert res["base"] <= res["p25"] <= res["median"] <= res["p75"] <= res["top"]
        assert len(res["sources"]) > 0


def test_currency_conversion():
    res_usd = SalaryService.get_verified_benchmark("Staff Registered Nurse (RN)", industry_id="healthcare", currency="USD")
    res_eur = SalaryService.get_verified_benchmark("Staff Registered Nurse (RN)", industry_id="healthcare", currency="EUR")
    res_gbp = SalaryService.get_verified_benchmark("Staff Registered Nurse (RN)", industry_id="healthcare", currency="GBP")

    assert res_usd["currency"] == "USD"
    assert res_eur["currency"] == "EUR"
    assert res_gbp["currency"] == "GBP"

    # EUR is 0.92 of USD
    expected_eur_median = round(res_usd["median"] * CURRENCY_RATES["EUR"]["rate"])
    assert res_eur["median"] == expected_eur_median


def test_benchmark_caching():
    b1 = SalaryService.get_verified_benchmark("Corporate Paralegal Specialist", industry_id="legal", country="US")
    b2 = SalaryService.get_verified_benchmark("Corporate Paralegal Specialist", industry_id="legal", country="US")
    assert b1["median"] == b2["median"]
    assert b1["role"] == b2["role"]
