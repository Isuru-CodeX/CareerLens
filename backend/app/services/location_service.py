import re
import urllib.parse
import logging
from typing import Optional, Dict, Any, List
import httpx

logger = logging.getLogger("careerlens.location")

# Offline lookup dictionary for instant enrichment without network delay
MAJOR_LOCATION_CACHE: Dict[str, Dict[str, str]] = {
    "london": {"country": "United Kingdom", "region": "Greater London", "postal_code": "W1W 6PQ"},
    "great portland street": {"city": "London", "country": "United Kingdom", "region": "Greater London", "postal_code": "W1W 6PQ"},
    "atlanta": {"region": "GA", "country": "United States", "postal_code": "30303"},
    "san francisco": {"region": "CA", "country": "United States", "postal_code": "94105"},
    "new york": {"region": "NY", "country": "United States", "postal_code": "10001"},
    "seattle": {"region": "WA", "country": "United States", "postal_code": "98101"},
    "austin": {"region": "TX", "country": "United States", "postal_code": "78701"},
    "boston": {"region": "MA", "country": "United States", "postal_code": "02108"},
    "chicago": {"region": "IL", "country": "United States", "postal_code": "60601"},
    "los angeles": {"region": "CA", "country": "United States", "postal_code": "90012"},
    "toronto": {"region": "ON", "country": "Canada", "postal_code": "M5H 2N2"},
    "sydney": {"region": "NSW", "country": "Australia", "postal_code": "2000"},
    "colombo": {"region": "Western Province", "country": "Sri Lanka", "postal_code": "00100"},
    "kandy": {"region": "Central Province", "country": "Sri Lanka", "postal_code": "20000"},
    "berlin": {"region": "Berlin", "country": "Germany", "postal_code": "10115"},
    "paris": {"region": "Île-de-France", "country": "France", "postal_code": "75001"},
    "tokyo": {"region": "Kanto", "country": "Japan", "postal_code": "100-0001"},
    "singapore": {"region": "Singapore", "country": "Singapore", "postal_code": "018989"},
}

# Regex matchers for embedded postal codes
UK_POSTCODE_RE = re.compile(r"\b([A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2})\b", re.IGNORECASE)
US_ZIP_RE = re.compile(r"\b([0-9]{5}(?:-[0-9]{4})?)\b")
CA_POSTAL_RE = re.compile(r"\b([A-Z][0-9][A-Z]\s*[0-9][A-Z][0-9])\b", re.IGNORECASE)

async def enrich_address_data(
    raw_address_or_line1: Optional[Any] = None,
    city: Optional[str] = None,
    region: Optional[str] = None,
    postal_code: Optional[str] = None,
    country: Optional[str] = None
) -> Dict[str, Optional[str]]:
    """
    Enriches partial address data by searching online and using spatial heuristics
    to auto-discover missing postal code, region, city, or country.
    Supports either passing a dictionary as first argument or keyword arguments.
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

    res = {
        "address_line1": (line1 or "").strip() or None,
        "city": (city or "").strip() or None,
        "region": (region or "").strip() or None,
        "postal_code": (postal_code or "").strip() or None,
        "country": (country or "").strip() or None,
    }

    # 1. First, check if postal code is already present inside line1 or city string
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

    # 2. Check offline cache
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
                if not res["postal_code"] and data.get("postal_code"):
                    res["postal_code"] = data["postal_code"]
                if not res["country"] and data.get("country"):
                    res["country"] = data["country"]
                if not res["region"] and data.get("region"):
                    res["region"] = data["region"]
                if not res["city"] and data.get("city"):
                    res["city"] = data["city"]
                break

    # 3. If postal code or country is still missing, perform online search via Nominatim
    if not res["postal_code"] or not res["country"]:
        query_parts = [res["address_line1"], res["city"], res["region"], res["country"]]
        query_str = ", ".join([p for p in query_parts if p and len(p) > 1])
        if query_str and len(query_str) >= 3:
            try:
                url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(query_str)}&format=json&addressdetails=1&limit=1"
                async with httpx.AsyncClient(timeout=3.5, headers={"User-Agent": "CareerLensAI-LocationResolver/1.0"}) as client:
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        data = resp.json()
                        if data and isinstance(data, list) and len(data) > 0:
                            addr = data[0].get("address", {})
                            if not res["postal_code"] and addr.get("postcode"):
                                res["postal_code"] = addr.get("postcode")
                            if not res["country"] and addr.get("country"):
                                res["country"] = addr.get("country")
                            if not res["region"] and (addr.get("state") or addr.get("province") or addr.get("county")):
                                res["region"] = addr.get("state") or addr.get("province") or addr.get("county")
                            if not res["city"] and (addr.get("city") or addr.get("town") or addr.get("suburb")):
                                res["city"] = addr.get("city") or addr.get("town") or addr.get("suburb")
            except Exception as e:
                logger.debug(f"Online geocoding lookup bypassed: {e}")

    res["line1"] = res["address_line1"]
    res["postalCode"] = res["postal_code"]
    return res

def suggest_industry_domain(target_role: Optional[str] = None, skills: Optional[List[str]] = None) -> str:
    """
    Infers and recommends the optimal Industry Domain based on candidate target role and skills.
    """
    text = f"{target_role or ''} {' '.join(skills or [])}".lower()

    if any(k in text for k in ["automotive", "car", "mechanic", "vehicle", "manufacturing", "assembly"]):
        return "Automotive & Advanced Manufacturing"
    if any(k in text for k in ["marketing", "seo", "branding", "public relations", "advertising", "social media", "content"]):
        return "Marketing & Digital Media"
    if any(k in text for k in ["finance", "banking", "fintech", "trading", "investment", "accounting", "risk"]):
        return "Financial Technology & Banking"
    if any(k in text for k in ["health", "medical", "hospital", "biotech", "pharma", "clinical"]):
        return "Healthcare & Biotechnology"
    if any(k in text for k in ["ai", "machine learning", "deep learning", "nlp", "computer vision", "llm"]):
        return "Artificial Intelligence & Data Platforms"
    if any(k in text for k in ["cyber", "security", "infosec", "penetration", "soc", "siem"]):
        return "Cybersecurity & Enterprise Defense"
    if any(k in text for k in ["retail", "ecommerce", "store manager", "merchandising", "sales"]):
        return "Retail & E-commerce"
    if any(k in text for k in ["education", "teacher", "professor", "academic", "university", "school"]):
        return "Higher Education & EdTech"
    if any(k in text for k in ["cloud", "devops", "software", "full stack", "fullstack", "backend", "frontend", "engineer", "developer", "fastapi", "react", "python", "node"]):
        return "Cloud Infrastructure & Software SaaS"
    if any(k in text for k in ["telecom", "telecommunications", "network", "voip"]):
        return "Telecommunications & Networking"

    return "Information Technology & Services"
