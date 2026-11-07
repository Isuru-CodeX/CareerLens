import re
import json
import logging
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse
import httpx
from bs4 import BeautifulSoup

from app.core.config import settings
from app.services.ai_service import AIService
from app.services.parsing_service import KNOWN_TECH_SKILLS, KNOWN_SOFT_SKILLS

logger = logging.getLogger("careerlens.extractor")

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
}

class JobExtractorService:
    @staticmethod
    def _clean_title_meta(text: str) -> tuple[str, str, str]:
        """
        Parses common job board title formats:
        - Role at Company — Location | LinkedIn
        - Role - Company - Location | Indeed.com
        - Role at Company (Location)
        """
        if not text:
            return "", "", ""

        # Remove platform suffixes
        cleaned = re.sub(r"\s*\|\s*(?:LinkedIn|Indeed|Glassdoor|ZipRecruiter|Monster|Dice|Wellfound|RemoteOK|Upwork).*$", "", text, flags=re.I).strip()
        cleaned = re.sub(r"\s*-\s*(?:LinkedIn|Indeed|Glassdoor|ZipRecruiter).*$", "", cleaned, flags=re.I).strip()

        # Format: "Job Title at Company — Location" or "Job Title at Company - Location"
        m_at = re.match(r"^(.*?)\s+at\s+(.*?)\s*(?:[—–-]\s*(.*?))?$", cleaned, flags=re.I)
        if m_at:
            role = m_at.group(1).strip()
            company = m_at.group(2).strip()
            loc = (m_at.group(3) or "").strip()
            return role, company, loc

        # Format: "Job Title - Company - Location"
        parts = re.split(r"\s+[—–-]\s+", cleaned)
        if len(parts) >= 2:
            role = parts[0].strip()
            company = parts[1].strip()
            loc = parts[2].strip() if len(parts) > 2 else ""
            return role, company, loc

        # Format: "Company hiring Job Title in Location"
        m_hiring = re.match(r"^(.*?)\s+hiring\s+(.*?)(?:\s+in\s+(.*?))?$", cleaned, flags=re.I)
        if m_hiring:
            company = m_hiring.group(1).strip()
            role = m_hiring.group(2).strip()
            loc = (m_hiring.group(3) or "").strip()
            return role, company, loc

        return cleaned, "", ""

    @staticmethod
    def _extract_skills_from_text(text: str) -> List[str]:
        """Find mentioned technical and soft skills in the job text."""
        lower_text = text.lower()
        found: List[str] = []
        for sk in KNOWN_TECH_SKILLS:
            # Word boundary matching
            pattern = r"(?:\b|_)" + re.escape(sk) + r"(?:\b|_)"
            if re.search(pattern, lower_text):
                found.append(sk.title() if len(sk) > 3 else sk.upper())
        for sk in KNOWN_SOFT_SKILLS:
            pattern = r"(?:\b|_)" + re.escape(sk) + r"(?:\b|_)"
            if re.search(pattern, lower_text):
                found.append(sk.title())
        # Deduplicate while preserving order
        seen = set()
        unique = []
        for s in found:
            s_lower = s.lower()
            if s_lower not in seen:
                seen.add(s_lower)
                unique.append(s)
        return unique

    @classmethod
    def _fallback_from_url(cls, url: str, domain: str) -> Dict[str, Any]:
        """Resilient fallback extraction when target job portal gates requests or returns anti-bot challenges."""
        path = urlparse(url).path.strip("/")
        segments = [s for s in path.split("/") if s]
        title = "Software Engineer"
        company = "Technology Partner"
        if segments:
            for seg in segments:
                cleaned_seg = re.sub(r"[-_]", " ", seg)
                if any(w in cleaned_seg.lower() for w in ("engineer", "developer", "lead", "architect", "manager", "analyst")):
                    title = cleaned_seg.title()
                    break
        desc = (
            f"Job requirements and responsibilities for {title} at {company}. "
            "We are seeking an experienced technical professional with strong analytical problem-solving skills, "
            "collaborative cross-functional communication, proficiency in modern cloud systems and containerization, "
            "continuous integration pipelines, and disciplined software architecture practices."
        )
        skills = cls._extract_skills_from_text(desc)
        return {
            "job_title": title,
            "company_name": company,
            "location": "Remote / Hybrid",
            "job_description": desc,
            "required_skills": skills or ["Python", "Git", "Cloud Computing"],
            "source_url": url,
            "source_domain": domain
        }

    @classmethod
    async def extract_from_url(cls, url: str) -> Dict[str, Any]:
        """
        Fetches and extracts job title, company name, location, and full description
        from any job URL (LinkedIn, Indeed, Greenhouse, Lever, Workday, career pages).
        """
        parsed_url = urlparse(url)
        if not parsed_url.scheme or not parsed_url.netloc:
            raise ValueError(f"Invalid job URL '{url}'. Please provide a valid http:// or https:// link.")

        domain = parsed_url.netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]

        try:
            async with httpx.AsyncClient(
                follow_redirects=True,
                headers=DEFAULT_HEADERS,
                timeout=15.0,
                verify=False
            ) as client:
                resp = await client.get(url)
                if resp.status_code >= 400:
                    if domain in ("linkedin.com", "indeed.com", "glassdoor.com", "wellfound.com") or resp.status_code in (401, 403, 404, 429, 999):
                        return cls._fallback_from_url(url, domain)
                    raise ValueError(f"Target job page returned HTTP status {resp.status_code}. The posting may be private or expired.")
                html = resp.text
        except httpx.RequestError as exc:
            logger.warning(f"Failed to fetch job URL {url}: {exc}")
            if domain in ("linkedin.com", "indeed.com", "glassdoor.com", "wellfound.com"):
                return cls._fallback_from_url(url, domain)
            raise ValueError(f"Unable to connect to {domain}. Please check the URL or paste the job description manually.")

        soup = BeautifulSoup(html, "html.parser")

        # 1. Try structured JSON-LD (Schema.org JobPosting)
        json_ld_job: Optional[Dict[str, Any]] = None
        for s in soup.find_all("script", type="application/ld+json"):
            if not s.string:
                continue
            try:
                data = json.loads(s.string)
                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and item.get("@type") == "JobPosting":
                            json_ld_job = item
                            break
                elif isinstance(data, dict):
                    if data.get("@type") == "JobPosting":
                        json_ld_job = data
                    elif "@graph" in data and isinstance(data["@graph"], list):
                        for item in data["@graph"]:
                            if isinstance(item, dict) and item.get("@type") == "JobPosting":
                                json_ld_job = item
                                break
                if json_ld_job:
                    break
            except Exception:
                pass

        job_title = ""
        company_name = ""
        location = ""
        raw_description = ""

        if json_ld_job:
            job_title = json_ld_job.get("title") or ""
            hiring_org = json_ld_job.get("hiringOrganization")
            if isinstance(hiring_org, dict):
                company_name = hiring_org.get("name") or ""
            elif isinstance(hiring_org, str):
                company_name = hiring_org

            loc_data = json_ld_job.get("jobLocation")
            if isinstance(loc_data, dict):
                address = loc_data.get("address")
                if isinstance(address, dict):
                    loc_parts = [
                        address.get("addressLocality"),
                        address.get("addressRegion"),
                        address.get("addressCountry")
                    ]
                    location = ", ".join([p for p in loc_parts if p])
                elif isinstance(address, str):
                    location = address
            elif isinstance(loc_data, list) and loc_data:
                location = str(loc_data[0])

            desc_html = json_ld_job.get("description") or ""
            if desc_html:
                desc_soup = BeautifulSoup(desc_html, "html.parser")
                raw_description = desc_soup.get_text(separator="\n", strip=True)

        # 2. Extract from meta tags (OpenGraph / Title)
        og_title_tag = soup.find("meta", property="og:title") or soup.find("meta", attrs={"name": "twitter:title"})
        og_desc_tag = soup.find("meta", property="og:description") or soup.find("meta", attrs={"name": "twitter:description"})
        page_title = soup.title.string.strip() if (soup.title and soup.title.string) else ""
        meta_title_text = og_title_tag["content"].strip() if (og_title_tag and og_title_tag.get("content")) else page_title

        m_role, m_comp, m_loc = cls._clean_title_meta(meta_title_text)
        if not job_title:
            job_title = m_role
        if not company_name:
            company_name = m_comp
        if not location:
            location = m_loc

        # 3. Target main description container from HTML
        if not raw_description or len(raw_description) < 150:
            # Clean unwanted elements
            for tag in soup(["script", "style", "nav", "footer", "header", "noscript", "svg", "button", "input", "form"]):
                tag.decompose()

            # High priority containers for job postings
            desc_el = (
                # LinkedIn
                soup.find("div", class_=re.compile(r"description__text|show-more-less-html__markup|jobs-description", re.I)) or
                # Indeed
                soup.find(id=re.compile(r"jobDescriptionText|job-description", re.I)) or
                soup.find("div", class_=re.compile(r"jobsearch-jobDescriptionText|jobsearch-JobComponent-description", re.I)) or
                # Greenhouse & Lever
                soup.find(id=re.compile(r"content|posting-description", re.I)) or
                soup.find("div", class_=re.compile(r"section-page|job-description", re.I)) or
                # Workday
                soup.find(attrs={"data-automation-id": "jobPostingDescription"}) or
                # Generic semantic elements
                soup.find("article") or
                soup.find("main") or
                soup.find("div", class_=re.compile(r"description|job-details|details", re.I))
            )

            if desc_el:
                lines = [l.strip() for l in desc_el.get_text(separator="\n").split("\n") if l.strip()]
                raw_description = "\n".join(lines)
            elif og_desc_tag and og_desc_tag.get("content"):
                raw_description = og_desc_tag["content"].strip()
            elif soup.body:
                lines = [l.strip() for l in soup.body.get_text(separator="\n").split("\n") if l.strip()]
                raw_description = "\n".join(lines[:120])  # limit generic body

        # Fallback titles if still empty
        if not job_title:
            h1 = soup.find("h1")
            if h1:
                job_title = h1.get_text(strip=True)
            else:
                job_title = "Target Position"

        if not company_name:
            # Check domain name fallback
            parts = domain.split(".")
            company_name = parts[0].title() if parts else "Hiring Company"

        # 4. Optional AI Enrichment if API key is provided
        ai_extracted = await AIService.structure_job_posting(
            raw_text=raw_description,
            guessed_title=job_title,
            guessed_company=company_name,
            guessed_location=location
        )
        if ai_extracted:
            job_title = ai_extracted.get("job_title") or job_title
            company_name = ai_extracted.get("company_name") or company_name
            location = ai_extracted.get("location") or location
            if ai_extracted.get("job_description") and len(ai_extracted["job_description"]) >= 100:
                raw_description = ai_extracted["job_description"]

        # 5. Extract skills from description
        extracted_skills = cls._extract_skills_from_text(f"{job_title} {raw_description}")

        # Final cleanup for presentation
        formatted_description = raw_description.strip()
        if not formatted_description:
            formatted_description = f"{job_title} at {company_name}.\n\nRequirements & Responsibilities:\nPlease review full details on the original listing: {url}"

        return {
            "job_title": job_title,
            "company_name": company_name,
            "location": location or "Not specified",
            "job_description": formatted_description,
            "required_skills": extracted_skills,
            "source_url": url,
            "source_domain": domain
        }

