"""
Adzuna API adapter for CareerLens Career Navigator.
Fetches job postings with salary metadata and predicts/estimated indicators.
Gracefully handles missing API keys, rate limits (HTTP 429), and network errors.
"""
import os
import logging
from typing import List, Optional
import httpx
from .base import RawJob
from ..work_mode import detect_work_mode

logger = logging.getLogger(__name__)

CURRENCY_MAP = {
    "us": "USD",
    "gb": "GBP",
    "au": "AUD",
    "ca": "CAD",
    "in": "INR",
    "de": "EUR",
    "fr": "EUR",
    "nl": "EUR",
}

URL_TEMPLATE = "https://api.adzuna.com/v1/api/jobs/{}/search/{}"


async def fetch_adzuna(
    term: str,
    country: str = "us",
    pages: int = 1,
    client: Optional[httpx.AsyncClient] = None
) -> List[RawJob]:
    """
    Fetches job postings from the Adzuna API for a canonical role or search term.
    """
    app_id = os.getenv("ADZUNA_APP_ID", "").strip()
    app_key = os.getenv("ADZUNA_APP_KEY", "").strip()

    if not app_id or not app_key:
        logger.info("Adzuna API credentials not configured; skipping Adzuna source.")
        return []

    c = country.lower().strip()
    currency = CURRENCY_MAP.get(c, "USD")
    out: List[RawJob] = []

    async def _query(cli: httpx.AsyncClient):
        for page in range(1, pages + 1):
            url = URL_TEMPLATE.format(c, page)
            try:
                r = await cli.get(
                    url,
                    params={
                        "app_id": app_id,
                        "app_key": app_key,
                        "what": term,
                        "results_per_page": 50,
                    },
                    timeout=15.0
                )
                if r.status_code == 429:
                    logger.warning("Adzuna rate limit (429) encountered. Halting page crawl.")
                    break
                if r.status_code != 200:
                    logger.warning("Adzuna returned status code %s for term '%s'", r.status_code, term)
                    break

                data = r.json()
                results = data.get("results", [])
                for j in results:
                    desc = j.get("description", "")
                    title = j.get("title", "")
                    full_text = f"{title} {desc}"
                    out.append(
                        RawJob(
                            source="adzuna",
                            external_id=str(j.get("id")),
                            title=title,
                            company=j.get("company", {}).get("display_name", "") if isinstance(j.get("company"), dict) else "",
                            location=j.get("location", {}).get("display_name", "") if isinstance(j.get("location"), dict) else "",
                            work_mode=detect_work_mode(full_text),
                            url=j.get("redirect_url", ""),
                            description=desc,
                            salary_min=float(j["salary_min"]) if j.get("salary_min") is not None else None,
                            salary_max=float(j["salary_max"]) if j.get("salary_max") is not None else None,
                            currency=currency,
                            period="year",
                            estimated=str(j.get("salary_is_predicted", "0")) == "1",
                        )
                    )
            except Exception as e:
                logger.warning("Error fetching Adzuna jobs for '%s': %s", term, e)
                break

    if client:
        await _query(client)
    else:
        async with httpx.AsyncClient(timeout=20.0) as cli:
            await _query(cli)

    return out
