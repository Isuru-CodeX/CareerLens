"""
Statistical salary normalizer and quartile aggregator for Career Navigator.
- Converts varying pay periods (hourly, monthly, yearly) to standardized annual compensation.
- Applies IQR (Interquartile Range) outlier filtering to strip pathological data points.
- Computes P25, Median (P50), and P75 quartiles with minimum sample thresholds.
"""
from typing import List, Optional, Dict, Any
import statistics

PERIOD_TO_YEAR = {
    "year": 1.0,
    "annual": 1.0,
    "month": 12.0,
    "monthly": 12.0,
    "hour": 2080.0,
    "hourly": 2080.0,
}


def annual_midpoint(job: Any) -> Optional[float]:
    """
    Computes normalized yearly midpoint for a job posting.
    Returns None if neither salary_min nor salary_max is available.
    """
    sal_min = getattr(job, "salary_min", None)
    sal_max = getattr(job, "salary_max", None)
    period = getattr(job, "period", "year") or "year"

    if sal_min is None and sal_max is None:
        return None

    lo = sal_min if sal_min is not None else sal_max
    hi = sal_max if sal_max is not None else sal_min

    if lo is None or hi is None:
        return None

    # Sanity bounds check
    if lo < 0 or hi < 0:
        return None

    mult = PERIOD_TO_YEAR.get(period.lower(), 1.0)
    annual_lo = lo * mult
    annual_hi = hi * mult

    mid = (annual_lo + annual_hi) / 2.0
    # Guard against unrealistic annual numbers (e.g. less than $10,000 or greater than $1,500,000)
    if mid < 10000.0 or mid > 1500000.0:
        return None

    return round(mid, 2)


def summarize(values: List[float], min_samples: int = 8) -> Optional[Dict[str, Any]]:
    """
    Computes median and 25th / 75th percentiles after removing IQR outliers.
    Returns None if fewer than min_samples usable values remain.
    """
    if not values or len(values) < min_samples:
        return None

    sorted_vals = sorted(values)
    try:
        # statistics.quantiles returns cut points: [p25, p50 (median), p75]
        cuts = statistics.quantiles(sorted_vals, n=4)
        q1 = cuts[0]
        q3 = cuts[2]
        iqr = q3 - q1

        # Outlier fence
        lo_fence = q1 - (1.5 * iqr)
        hi_fence = q3 + (1.5 * iqr)

        clean = [v for v in sorted_vals if lo_fence <= v <= hi_fence]
        if len(clean) < min_samples:
            return None

        clean_cuts = statistics.quantiles(clean, n=4)
        return {
            "p25": round(clean_cuts[0], 2),
            "median": round(clean_cuts[1], 2),
            "p75": round(clean_cuts[2], 2),
            "n": len(clean)
        }
    except Exception:
        return None

