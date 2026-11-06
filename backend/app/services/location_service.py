import re
import urllib.parse
import logging
from typing import Optional, Dict, Any, List
import httpx
from pydantic import BaseModel

from app.services.years_service import INDUSTRIES

logger = logging.getLogger("careerlens.location")

# Offline lookup dictionary for instant enrichment without network delay
MAJOR_LOCATION_CACHE: Dict[str, Dict[str, str]] = {
    "london": {"city": "London", "country": "United Kingdom", "region": "Greater London", "postal_code": "W1W 6PQ"},
    "great portland street": {"city": "London", "country": "United Kingdom", "region": "Greater London", "postal_code": "W1W 6PQ"},
    "atlanta": {"city": "Atlanta", "region": "GA", "country": "United States", "postal_code": "30303"},
    "san francisco": {"city": "San Francisco", "region": "CA", "country": "United States", "postal_code": "94105"},
    "new york": {"city": "New York", "region": "NY", "country": "United States", "postal_code": "10001"},
    "seattle": {"city": "Seattle", "region": "WA", "country": "United States", "postal_code": "98101"},
    "austin": {"city": "Austin", "region": "TX", "country": "United States", "postal_code": "78701"},
    "boston": {"city": "Boston", "region": "MA", "country": "United States", "postal_code": "02108"},
    "chicago": {"city": "Chicago", "region": "IL", "country": "United States", "postal_code": "60601"},
    "los angeles": {"city": "Los Angeles", "region": "CA", "country": "United States", "postal_code": "90012"},
    "toronto": {"city": "Toronto", "region": "ON", "country": "Canada", "postal_code": "M5H 2N2"},
    "sydney": {"city": "Sydney", "region": "NSW", "country": "Australia", "postal_code": "2000"},
    "colombo": {"city": "Colombo", "region": "Western Province", "country": "Sri Lanka", "postal_code": "00100"},
    "kandy": {"city": "Kandy", "region": "Central Province", "country": "Sri Lanka", "postal_code": "20000"},
    "berlin": {"city": "Berlin", "region": "Berlin", "country": "Germany", "postal_code": "10115"},
    "paris": {"city": "Paris", "region": "Île-de-France", "country": "France", "postal_code": "75001"},
    "tokyo": {"city": "Tokyo", "region": "Kanto", "country": "Japan", "postal_code": "100-0001"},
    "singapore": {"city": "Singapore", "region": "Singapore", "country": "Singapore", "postal_code": "018989"},
}

# Regex matchers for embedded postal codes
UK_POSTCODE_RE = re.compile(r"\b([A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2})\b", re.IGNORECASE)
US_ZIP_RE = re.compile(r"\b([0-9]{5}(?:-[0-9]{4})?)\b")
CA_POSTAL_RE = re.compile(r"\b([A-Z][0-9][A-Z]\s*[0-9][A-Z][0-9])\b", re.IGNORECASE)
LK_POSTAL_RE = re.compile(r"\b(0[0-9]{4}|[1-9][0-9]{4})\b")

class AddressParseResult(BaseModel):
    street_address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None

async def enrich_address_data(
    raw_address_or_line1: Optional[Any] = None,
    city: Optional[str] = None,
    region: Optional[str] = None,
    postal_code: Optional[str] = None,
    country: Optional[str] = None
) -> Dict[str, Optional[str]]:
    """
    Enriches partial address data by searching online, checking spatial heuristics,
    or using Gemini AI to discover missing city, region, postal code, and country.
    """
    if isinstance(raw_address_or_line1, dict):
        line1 = raw_address_or_line1.get("line1") or raw_address_or_line1.get("address_line1")
        city = raw_address_or_line1.get("city") or city
        region = raw_address_or_line1.get("region") or region
        postal_code = raw_address_or_line1.get("postalCode") or raw_address_or_line1.get("postal_code") or postal_code
        country = raw_address_or_line1.get("country") or country
    elif isinstance(raw_address_or_line1, str):
        line1 = raw_address_or_line1
    else:
        line1 = None

    raw_input_line = (line1 or "").strip()
    res: Dict[str, Optional[str]] = {
        "address_line1": raw_input_line or None,
        "city": (city or "").strip() or None,
        "region": (region or "").strip() or None,
        "postal_code": (postal_code or "").strip() or None,
        "country": (country or "").strip() or None,
    }

    # 1. Try Gemini AI parsing if available
    try:
        from app.services.llm_client import LLMClient
        client = LLMClient()
        if client.available and raw_input_line:
            prompt = (
                f"Parse the following input address into components: street_address, city, region (state/province), "
                f"postal_code, country.\nInput: {raw_input_line}\n"
                f"Existing City: {res['city'] or ''}\nExisting Region: {res['region'] or ''}\n"
                f"Existing Postal: {res['postal_code'] or ''}\nExisting Country: {res['country'] or ''}"
            )
            parsed = client.generate_json(
                system="You are an expert geographical address parser. Extract exact address parts without inventing fake data.",
                user=prompt,
                out_model=AddressParseResult
            )
            if parsed.city:
                res["city"] = parsed.city
            if parsed.region:
                res["region"] = parsed.region
            if parsed.postal_code:
                res["postal_code"] = parsed.postal_code
            if parsed.country:
                res["country"] = parsed.country
            if parsed.street_address and parsed.street_address != raw_input_line:
                res["address_line1"] = parsed.street_address
            res["line1"] = res["address_line1"]
            res["postalCode"] = res["postal_code"]
            return res
    except Exception as e:
        logger.debug(f"LLM address parsing bypassed: {e}")

    # 2. Check if postal code is already present inside line1 or other fields
    combined_raw = f"{res['address_line1'] or ''} {res['city'] or ''} {res['region'] or ''}"
    if not res["postal_code"]:
        uk_m = UK_POSTCODE_RE.search(combined_raw)
        if uk_m:
            res["postal_code"] = uk_m.group(1).upper()
            if not res["country"]:
                res["country"] = "United Kingdom"
        else:
            ca_m = CA_POSTAL_RE.search(combined_raw)
            if ca_m:
                res["postal_code"] = ca_m.group(1).upper()
                if not res["country"]:
                    res["country"] = "Canada"
            else:
                us_m = US_ZIP_RE.search(combined_raw)
                if us_m:
                    res["postal_code"] = us_m.group(1)
                    if not res["country"]:
                        res["country"] = "United States"

    # 3. Check offline cache for known major cities
    search_keys = [
        (res["city"] or "").lower(),
        (res["address_line1"] or "").lower(),
        (res["region"] or "").lower()
    ]
    for key in search_keys:
        if not key:
            continue
        for cache_key, data in MAJOR_LOCATION_CACHE.items():
            if cache_key in key:
                if not res["city"] and data.get("city"):
                    res["city"] = data["city"]
                if not res["postal_code"] and data.get("postal_code"):
                    res["postal_code"] = data["postal_code"]
                if not res["country"] and data.get("country"):
                    res["country"] = data["country"]
                if not res["region"] and data.get("region"):
                    res["region"] = data["region"]
                break

    # 4. If any component is still missing, search online via OpenStreetMap Nominatim
    if not res["city"] or not res["postal_code"] or not res["country"] or not res["region"]:
        query_parts = [res["address_line1"], res["city"], res["region"], res["country"]]
        query_str = ", ".join([p for p in query_parts if p and len(p) > 1])
        if query_str and len(query_str) >= 3:
            try:
                url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(query_str)}&format=json&addressdetails=1&limit=1"
                async with httpx.AsyncClient(timeout=4.0, headers={"User-Agent": "CareerLensAI-LocationResolver/2.0"}) as client:
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        data = resp.json()
                        if data and isinstance(data, list) and len(data) > 0:
                            addr = data[0].get("address", {})
                            display_name = data[0].get("display_name", "")

                            if not res["postal_code"] and addr.get("postcode"):
                                res["postal_code"] = addr.get("postcode")
                            if not res["country"] and addr.get("country"):
                                res["country"] = addr.get("country")
                            if not res["region"]:
                                res["region"] = (
                                    addr.get("state")
                                    or addr.get("province")
                                    or addr.get("county")
                                    or addr.get("state_district")
                                )
                            if not res["city"]:
                                res["city"] = (
                                    addr.get("city")
                                    or addr.get("town")
                                    or addr.get("suburb")
                                    or addr.get("municipality")
                                    or addr.get("village")
                                    or addr.get("city_district")
                                )
                            # If region still empty but Greater London or state in display_name
                            if not res["region"] and "Greater London" in display_name:
                                res["region"] = "Greater London"
                            # If city is City of Westminster, people prefer London
                            if res["city"] == "City of Westminster" and "London" in display_name:
                                res["city"] = "London"
            except Exception as e:
                logger.debug(f"Online geocoding lookup bypassed: {e}")

    # 5. Segment decomposition heuristic:
    # If address_line1 contains commas, e.g. "177 Great Portland Street, London W1W 6PQ"
    # or "102 Park Avenue, New York, NY 10001", clean up line1 so it's strictly the street part
    if res["address_line1"] and "," in res["address_line1"]:
        parts = [p.strip() for p in res["address_line1"].split(",") if p.strip()]
        if len(parts) >= 2:
            first_part = parts[0]
            rest_joined = " ".join(parts[1:])
            # If rest contains city or postal code or country, set address_line1 to first_part
            if (res["city"] and res["city"].lower() in rest_joined.lower()) or \
               (res["postal_code"] and res["postal_code"].lower() in rest_joined.lower()) or \
               (res["country"] and res["country"].lower() in rest_joined.lower()):
                res["address_line1"] = first_part

            # Also, if city is still missing, the second segment is often the city!
            if not res["city"]:
                second_part_clean = re.sub(r"[0-9\-]+", "", parts[1]).strip()
                if second_part_clean and len(second_part_clean) > 1:
                    res["city"] = second_part_clean

    res["line1"] = res["address_line1"]
    res["postalCode"] = res["postal_code"]
    return res

def suggest_industry_domain(
    target_role: Optional[str] = None,
    skills: Optional[List[str]] = None,
    experience_titles: Optional[List[str]] = None
) -> str:
    """
    Infers and recommends the optimal Industry Domain based on candidate target role,
    verified skills, and work experiences. Matches one of the canonical 17 INDUSTRIES.
    """
    # 1. Use Gemini / LLM if available
    try:
        from app.services.llm_client import LLMClient
        client = LLMClient()
        if client.available and (target_role or skills or experience_titles):
            candidates_list = ", ".join(INDUSTRIES)
            prompt = (
                f"Candidate Target Role: {target_role or 'Not specified'}\n"
                f"Candidate Skills: {', '.join(skills or []) or 'Not specified'}\n"
                f"Past Roles: {', '.join(experience_titles or []) or 'Not specified'}\n\n"
                f"Choose the single most fitting industry from this exact list:\n{candidates_list}\n"
                f"Return ONLY the exact name from the list and nothing else."
            )
            raw = client.generate_text(
                prompt=prompt,
                system="You are an expert career counselor. Select the single best matching industry domain.",
                max_tokens=60
            ).strip().strip('"').strip("'")
            for ind in INDUSTRIES:
                if ind.lower() == raw.lower():
                    return ind
            for ind in INDUSTRIES:
                if ind.lower() in raw.lower():
                    return ind
    except Exception as e:
        logger.debug(f"LLM industry suggestion bypassed: {e}")

    # 2. Heuristic rule-based matching covering all 17 canonical industries
    text = f"{target_role or ''} {' '.join(experience_titles or [])} {' '.join(skills or [])}".lower()

    if any(k in text for k in ["store manager", "retail", "ecommerce", "e-commerce", "merchandising", "shop", "cashier", "supermarket", "sales associate"]):
        return "Retail & E-commerce"

    if any(k in text for k in ["marketing", "seo", "branding", "public relations", "advertising", "social media", "copywriting", "campaign"]):
        return "Marketing & Advertising"

    if any(k in text for k in ["finance", "banking", "fintech", "trading", "investment", "accounting", "accountant", "auditor", "hedge", "tax"]):
        return "Finance & Banking"

    if any(k in text for k in ["health", "medical", "hospital", "biotech", "pharma", "clinical", "nurse", "doctor", "physician", "patient"]):
        return "Healthcare"

    if any(k in text for k in ["education", "teacher", "professor", "academic", "university", "school", "instructor", "lecturer", "tutor", "curriculum"]):
        return "Education"

    if any(k in text for k in ["media", "video", "film", "audio", "broadcasting", "journalist", "journalism", "photography", "creative writer", "entertainment"]):
        return "Media & Entertainment"

    if any(k in text for k in ["automotive", "car", "mechanic", "vehicle"]):
        return "Automotive & Manufacturing"

    if any(k in text for k in ["manufacturing", "assembly", "plant", "machinist", "factory", "industrial"]):
        return "Manufacturing"

    if any(k in text for k in ["telecom", "telecommunications", "network engineer", "voip", "fiber", "wireless", "rf"]):
        return "Telecommunications"

    if any(k in text for k in ["construction", "civil engineer", "architect", "structural", "contractor", "building"]):
        return "Engineering & Construction"

    if any(k in text for k in ["hotel", "hospitality", "tourism", "restaurant", "chef", "culinary", "travel", "catering"]):
        return "Hospitality & Tourism"

    if any(k in text for k in ["logistics", "supply chain", "warehouse", "freight", "transport", "shipping", "fleet", "inventory"]):
        return "Logistics & Transport"

    if any(k in text for k in ["government", "civil service", "public sector", "policy", "defense", "municipal"]):
        return "Government & Public Sector"

    if any(k in text for k in ["non-profit", "nonprofit", "ngo", "charity", "fundraising", "volunteer"]):
        return "Non-profit"

    if any(k in text for k in ["consultant", "consulting", "advisory", "strategy", "management consultant"]):
        return "Consulting"

    if any(k in text for k in ["software", "saas", "frontend", "backend", "fullstack", "full stack", "react", "fastapi", "django", "node", "web dev", "developer", "programmer"]):
        return "Software & SaaS"

    if any(k in text for k in ["cloud", "devops", "engineer", "python", "java", "sql", "git", "database", "sysadmin", "cyber", "ai", "machine learning", "data", "it"]):
        return "Information Technology"

    return "Information Technology" if (skills or target_role) else "Other"
