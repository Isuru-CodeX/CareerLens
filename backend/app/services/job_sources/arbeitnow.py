"""
Arbeitnow free European and remote job feed adapter for CareerLens Career Navigator.
Fetches live jobs without requiring an API key.
Requires source attribution and direct link to job posting.
"""
import logging
from typing import List, Optional
import httpx
from .base import RawJob
from ..work_mode import detect_work_mode

logger = logging.getLogger(__name__)

ARBEITNOW_URL = "https://www.arbeitnow.com/api/job-board-api"


async def fetch_arbeitnow(
    term: str,
    client: Optional[httpx.AsyncClient] = None
) -> List[RawJob]:
    """
    Fetches job postings from Arbeitnow and filters by canonical role keyword.
    """
    out: List[RawJob] = []
    norm_term = term.lower().strip()

    async def _query(cli: httpx.AsyncClient):
        try:
            r = await cli.get(ARBEITNOW_URL, timeout=15.0)
            if r.status_code != 200:
                logger.warning("Arbeitnow API returned %s", r.status_code)
                return

            data = r.json()
            jobs = data.get("data", [])
            for j in jobs:
                title = j.get("title", "")
                tags = j.get("tags", [])
                tags_str = " ".join(tags) if isinstance(tags, list) else ""
                combined_meta = f"{title} {tags_str}".lower()

                # Arbeitnow does not have server-side keyword search param; match locally
                if norm_term and (norm_term not in combined_meta):
                    # Check token overlap
                    tokens = [t for t in norm_term.split() if len(t) > 2]
                    if not any(token in combined_meta for token in tokens):
                        continue

                is_remote = bool(j.get("remote"))
                work_mode = detect_work_mode(title, remote_flag=is_remote)

                out.append(
                    RawJob(
                        source="arbeitnow",
                        external_id=str(j.get("slug") or j.get("id")),
                        title=title,
                        company=j.get("company_name", ""),
                        location=j.get("location", "Europe / Remote"),
                        work_mode=work_mode,
                        url=j.get("url", ""),
                        description=j.get("description", "") or "",
                        salary_min=None,
                        salary_max=None,
                        currency="EUR",
                        period="year",
                        estimated=False,
                    )
                )
        except Exception as e:
            logger.warning("Error fetching Arbeitnow jobs for '%s': %s", term, e)

    if client:
        await _query(client)
    else:
        async with httpx.AsyncClient(timeout=20.0) as cli:
            await _query(cli)

    return out
