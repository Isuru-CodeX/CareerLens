"""Improved no-LLM fallback: used when no API key is configured or the LLM call fails."""
import re, datetime
from typing import Dict, List, Optional, Tuple
from .skill_taxonomy import find_skills, related_credit

PREFERRED_HDR = re.compile(r'\b(nice[- ]to[- ]have|preferred|bonus|desirable|a plus|good to have|advantageous)\b', re.I)
REQUIRED_HDR  = re.compile(r'\b(requirements?|required|must[- ]have|qualifications?|what you.?ll need|you have|minimum|essential)\b', re.I)
OTHER_HDR     = re.compile(r'\b(responsibilities|about (us|the role)|benefits|what you.?ll do|perks)\b', re.I)

def split_jd(job_text: str) -> Dict[str, List[str]]:
    section, buckets = "required", {"required": [], "preferred": [], "other": []}
    for line in job_text.split("\n"):
        s = line.strip()
        is_header = (len(s) < 60 and (s.endswith(":") or s.isupper())) or s.startswith("#")
        if is_header:
            if PREFERRED_HDR.search(s): section = "preferred"
            elif REQUIRED_HDR.search(s): section = "required"
            elif OTHER_HDR.search(s): section = "other"
            continue
        # inline cue on the same bullet: "... is a plus", "(nice to have)"
        sec = "preferred" if PREFERRED_HDR.search(s) else section
        buckets[sec].append(line)
    return buckets

MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split()
_DATE = r'(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(?:19|20)\d{2}'
_RANGE = re.compile(rf'({_DATE})\s*(?:-|–|—|to)\s*({_DATE}|present|current|now)', re.I)

def _to_date(tok: str, end: bool) -> datetime.date:
    """Start dates -> first day of the month; end dates -> first day of the FOLLOWING month (inclusive range)."""
    tok = tok.strip().lower()
    if tok in ("present", "current", "now"):
        return datetime.date.today()
    m = re.match(r'([a-z]+)?\.?\s*((?:19|20)\d{2})', tok)
    year = int(m.group(2))
    has_month = bool(m.group(1)) and m.group(1)[:3] in MONTHS
    month = MONTHS.index(m.group(1)[:3]) + 1 if has_month else (12 if end else 1)
    if end:                                   # "Dec 2020" means through the end of December 2020
        return datetime.date(year + (month == 12), (month % 12) + 1, 1)
    return datetime.date(year, month, 1)

def estimate_years(resume_text: str) -> float:
    spans: List[Tuple[datetime.date, datetime.date]] = []
    for a, b in _RANGE.findall(resume_text):
        s, e = _to_date(a, False), _to_date(b, True)
        if e >= s: spans.append((s, e))
    spans.sort(); merged: List[List[datetime.date]] = []
    for s, e in spans:                      # merge overlaps so parallel jobs aren't double-counted
        if merged and s <= merged[-1][1]: merged[-1][1] = max(merged[-1][1], e)
        else: merged.append([s, e])
    return round(sum((e - s).days for s, e in merged) / 365.25, 1)

def jd_years(job_text: str) -> Optional[float]:
    m = re.search(r'(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?(?:years|yrs)', job_text, re.I)
    return float(m.group(1)) if m else None

def quick_match(resume_text: str, job_text: str) -> dict:
    buckets = split_jd(job_text)
    req = find_skills("\n".join(buckets["required"]))
    pref = {k: v for k, v in find_skills("\n".join(buckets["preferred"])).items() if k not in req}
    have = find_skills(resume_text)
    rows = []
    for name, jd_line in list(req.items()) + list(pref.items()):
        imp = "must" if name in req else "nice"
        if name in have:   rows.append((name, imp, "met", have[name]))
        elif related_credit(name, set(have)):
            rel = related_credit(name, set(have)); rows.append((name, imp, "transferable", f"No {name}, but has related skill {rel}"))
        else:              rows.append((name, imp, "missing", ""))
    credit = {"met": 1.0, "transferable": 0.4, "missing": 0.0}
    wt = {"must": 3.0, "nice": 1.0}
    tot = sum(wt[i] for _, i, _, _ in rows) or 1
    got = sum(wt[i] * credit[s] for _, i, s, _ in rows)
    cov = round(100 * got / tot, 1)
    yrs, need = estimate_years(resume_text), jd_years(job_text)
    exp = None if need is None else round(min(1.0, yrs / need) * 100, 1)
    return {"coverage": cov, "candidate_years": yrs, "jd_years": need, "experience_fit": exp, "rows": rows}
