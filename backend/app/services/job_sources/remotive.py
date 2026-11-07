"""
Remotive free remote job feed adapter for CareerLens Career Navigator.
Fetches curated live remote tech and digital jobs without requiring API keys.
Requires source attribution and linking to the canonical posting URL.
"""
import re
import logging
from typing import List, Optional, Tuple
import httpx
from .base import RawJob

logger = logging.getLogger(__name__)

REMOTIVE_URL = "https://remotive.com/api/remote-jobs"

# Regular expression to extract salary figures from strings like "$90k - $120k", "$80,000 - $110,000", "$60 / hr"
_SALARY_RANGE_RE = re.compile(
    r"(?:\$|USD\s*)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*k?|\d+\s*k)\s*(?:-|to|–)\s*(?:\$|USD\s*)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*k?|\d+\s*k)\s*(?:/(year|yr|hr|hour|mo|month)|per\s+(year|yr|hr|hour|month))?",
    re.I
)
_SALARY_SINGLE_RE = re.compile(
    r"(?:\$|USD\s*)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*k?|\d+\s*k)\s*(?:/(year|yr|hr|hour|mo|month)|per\s+(year|yr|hr|hour|month))?",
    re.I
)


def _parse_val(raw: str) -> float:
    s = raw.lower().replace(",", "").replace("$", "").replace(" ", "").strip()
    if s.endswith("k"):
        return float(s[:-1]) * 1000.0
    return float(s)


def parse_salary_text(text: str | None) -> Tuple[Optional[float], Optional[float], str]:
    """
    Parses a salary text string into (min, max, period).
    Returns (None, None, 'year') if no valid salary found.
    """
    if not text:
        return None, None, "year"
        
    s = text.strip()
    range_match = _SALARY_RANGE_RE.search(s)
    if range_match:
        try:
            lo = _parse_val(range_match.group(1))
            hi = _parse_val(range_match.group(2))
            period_str = (range_match.group(3) or range_match.group(4) or "").lower()
            period = "year"
            if period_str in ("hr", "hour"):
                period = "hour"
            elif period_str in ("mo", "month"):
                period = "month"
            elif lo < 250 and hi < 250:
                period = "hour"
            elif lo < 20000 and hi < 20000 and (lo > 1000 or hi > 1000):
                period = "month"
            return lo, hi, period
        except Exception:
            pass

    single_match = _SALARY_SINGLE_RE.search(s)
    if single_match:
        try:
            val = _parse_val(single_match.group(1))
            period_str = (single_match.group(2) or single_match.group(3) or "").lower()
            period = "year"
            if period_str in ("hr", "hour") or val < 250:
                period = "hour"
            elif period_str in ("mo", "month") or (val < 20000 and val > 1000):
                period = "month"
            return val, val, period
        except Exception:
            pass

    return None, None, "year"


async def fetch_remotive(
    term: str,
    client: Optional[httpx.AsyncClient] = None
) -> List[RawJob]:
    """
    Fetches remote jobs from Remotive API for a search query.
    """
    out: List[RawJob] = []

    async def _query(cli: httpx.AsyncClient):
        try:
            r = await cli.get(
                REMOTIVE_URL,
                params={"search": term, "limit": 50},
                timeout=15.0
            )
            if r.status_code != 200:
                logger.warning("Remotive API returned %s for '%s'", r.status_code, term)
                return

            data = r.json()
            jobs = data.get("jobs", [])
            for j in jobs:
                sal_min, sal_max, period = parse_salary_text(j.get("salary"))
                out.append(
                    RawJob(
                        source="remotive",
                        external_id=str(j.get("id")),
                        title=j.get("title", ""),
                        company=j.get("company_name", ""),
                        location=j.get("candidate_required_location") or "Worldwide / Remote",
                        work_mode="remote",
                        url=j.get("url", ""),
                        description=j.get("description", "") or "",
                        salary_min=sal_min,
                        salary_max=sal_max,
                        currency="USD",
                        period=period,
                        estimated=False,
                    )
                )
        except Exception as e:
            logger.warning("Error fetching Remotive jobs for '%s': %s", term, e)

    if client:
        await _query(client)
    else:
        async with httpx.AsyncClient(timeout=20.0) as cli:
            await _query(cli)

    return out
