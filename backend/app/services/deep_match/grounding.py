"""app/services/deep_match/grounding.py - reject any 'evidence' that is not really in the resume."""
import re
from typing import List
from .schemas import Assessment

def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", text.lower())).strip()

def quote_in_text(quote: str, text: str, threshold: float = 0.85) -> bool:
    q, t = _norm(quote), _norm(text)
    if not q:
        return False
    if q in t:
        return True
    qt, tt = q.split(), t.split()
    n = len(qt)
    if n < 3 or len(tt) < n:
        return False
    qset, best = set(qt), 0.0
    for i in range(len(tt) - n + 1):          # sliding window: tolerate small wording/OCR drift
        best = max(best, len(qset & set(tt[i:i + n])) / len(qset))
        if best >= threshold:
            return True
    return False

def ground_assessments(assessments: List[Assessment], resume_text: str) -> List[Assessment]:
    """Any positive claim without verifiable evidence is downgraded to 'unclear'."""
    for a in assessments:
        if a.status in ("met", "partial", "transferable"):
            if not a.evidence_quote or not quote_in_text(a.evidence_quote, resume_text):
                a.verified = False
                a.status = "unclear"
                a.confidence = min(a.confidence, 0.3)
                a.reasoning += " [Downgraded: quoted evidence could not be found in the resume text.]"
    return assessments
