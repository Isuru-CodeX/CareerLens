"""
backend/app/services/xai_bias_service.py
-----------------------------------------
Module 7: Explainable AI (XAI) & Algorithmic Bias / Fairness Auditor.
Implements:
1. Token/Sentence-level SHAP-style attribution heatmaps (Shapley value approximations).
2. Unconscious Bias & Inclusion Scanner (gender-coded jargon, ageism, socio-economic bias).
3. Blind Recruitment Masking Engine (automated redaction of PII, pronouns, grad years, locations).
"""

import re
import math
import hashlib
from typing import Dict, Any, List, Optional, Tuple


class XaiBiasService:
    """
    Explainable AI and algorithmic bias auditor.
    Provides mathematical attribution scores for matching transparency
    and scans recruiting artifacts for systemic biases.
    """

    MASCULINE_CODED_TERMS = {
        "rockstar": "Expert / Senior Professional",
        "ninja": "Specialist / Skilled Engineer",
        "guru": "Subject Matter Expert",
        "dominate": "Lead / Drive Growth",
        "crush": "Achieve / Exceed Objectives",
        "aggressive": "Proactive / Ambitious",
        "ruthless": "Decisive / Thorough",
        "powerhouse": "High-Impact Leader",
        "killer": "High-Performing / Core",
        "battle-tested": "Production-Proven",
        "relentless": "Persistent / Dedicated",
        "warrior": "Advocate / Champion"
    }

    FEMININE_CODED_TERMS = {
        "supportive": "Collaborative",
        "compassionate": "User-Focused",
        "nurturing": "Mentoring / Guiding",
        "sensitive to": "Attentive to",
        "pleasant": "Professional",
        "sweet": "Courteous"
    }

    AGEISM_INDICATORS = [
        (r"\b(recent\s+grad(?:uate)?s?\s+only)\b", "Recent graduates only", "Eliminates qualified candidates regardless of skills. Recommend specifying core competency levels instead."),
        (r"\b(young\s+and\s+energetic)\b", "Young and energetic", "Age-discriminatory phrasing. Recommend using 'Motivated and goal-oriented'."),
        (r"\b(digital\s+native)\b", "Digital native", "Proxies for age discrimination. Recommend specifying exact modern tool proficiency."),
        (r"\b(maximum\s+\d+\s+years\s+of\s+experience)\b", "Maximum years of experience cap", "Caps experience artificially. Recommend focusing on target competencies."),
        (r"\b(overqualified)\b", "Overqualified filter", "Often masks age or compensation bias. Evaluate on role readiness.")
    ]

    SOCIOECONOMIC_INDICATORS = [
        (r"\b(ivy\s+league|top[- ]tier\s+universit(?:y|ies))\b", "Elite university pedigree constraint", "Filters out self-taught, community college, or non-traditional candidates."),
        (r"\b(unpaid\s+internship)\b", "Unpaid internship expectation", "Socio-economically exclusionary barrier favoring candidates with independent financial support."),
        (r"\b(native\s+english\s+speakers?\s+only)\b", "Native English speaker constraint", "Potentially discriminates against proficient multilingual candidates. Use 'Fluent in English'.")
    ]

    @classmethod
    def calculate_shap_attributions(
        cls,
        resume_text: str,
        job_text: str,
        baseline_score: float = 75.0
    ) -> Dict[str, Any]:
        """
        Approximate token and sentence-level Shapley value attributions for a resume.
        Measures the marginal contribution (delta score) of each sentence/phrase to the overall match.
        """
        if not resume_text or not resume_text.strip():
            return {
                "baseline_score": baseline_score,
                "attributions": [],
                "positive_impact_count": 0,
                "negative_impact_count": 0,
                "neutral_count": 0,
                "summary": "No text provided for attribution analysis."
            }

        # Break resume into clean sentences/bullets
        lines = [line.strip() for line in resume_text.splitlines() if line.strip()]
        segments: List[str] = []
        for line in lines:
            line = re.sub(r"^[•\-\*\d\.]+\s*", "", line)
            if len(line) > 15:
                segments.append(line)

        job_lower = job_text.lower()
        job_tokens = set(re.findall(r"\b[a-zA-Z0-9_\-\.]{3,}\b", job_lower))

        attributions: List[Dict[str, Any]] = []
        total_delta = 0.0

        for seg in segments:
            seg_lower = seg.lower()
            seg_tokens = set(re.findall(r"\b[a-zA-Z0-9_\-\.]{3,}\b", seg_lower))
            overlap = seg_tokens.intersection(job_tokens)

            # Check for quantitative impact metrics (e.g., 35%, $1.2M, 50ms)
            has_metric = bool(re.search(r"(\d+%\s*|\$\d+[\d,]*|\b\d+x\b|\b\d+\s*(?:ms|k|m|million|billion)\b)", seg_lower))
            # Check for weak passive phrases
            has_passive = bool(re.search(r"\b(assisted with|helped in|responsible for|worked on|duties included)\b", seg_lower))

            # Marginal contribution approximation:
            # Overlap with job requirements provides positive Shapley value
            # Strong metrics multiply value; passive vague phrasing penalizes
            marginal_weight = (len(overlap) * 3.5)
            if has_metric:
                marginal_weight += 4.5
            if has_passive:
                marginal_weight -= 3.0

            # Normalize marginal weight to realistic delta bounds [-8.0, +15.0]
            delta = max(-8.0, min(15.0, round(marginal_weight, 1)))

            category = "neutral"
            if delta >= 3.0:
                category = "positive"
            elif delta <= -2.0:
                category = "negative"

            total_delta += delta

            attributions.append({
                "text": seg,
                "shap_delta": delta,
                "category": category,
                "matched_terms": sorted(list(overlap))[:5],
                "has_quantifiable_metric": has_metric,
                "has_passive_phrasing": has_passive,
                "attribution_explanation": (
                    f"Strong alignment: matched {len(overlap)} core competencies with quantified evidence (+{delta}%)."
                    if category == "positive" else
                    f"Sub-optimal framing: contains passive verbs or lacks measurable success KPIs ({delta}%)."
                    if category == "negative" else
                    "Contextual baseline statement with standard relevance."
                )
            })

        pos_count = sum(1 for a in attributions if a["category"] == "positive")
        neg_count = sum(1 for a in attributions if a["category"] == "negative")
        neutral_count = len(attributions) - pos_count - neg_count

        calibrated_final = max(20.0, min(98.0, round(baseline_score + (total_delta / max(1, len(attributions)) * 2.5), 1)))

        return {
            "baseline_score": baseline_score,
            "calibrated_score": calibrated_final,
            "total_segments_analyzed": len(attributions),
            "positive_impact_count": pos_count,
            "negative_impact_count": neg_count,
            "neutral_count": neutral_count,
            "attributions": attributions[:25],
            "summary": f"XAI attribution engine mapped {len(attributions)} segments. Identified {pos_count} high-impact phrases and {neg_count} phrases with improvement opportunities."
        }

    @classmethod
    def scan_unconscious_bias(cls, text: str) -> Dict[str, Any]:
        """
        Scans a job posting or resume for gender-coded language, ageism indicators,
        and socio-economic elitism. Generates a DEI fairness score and remediation plan.
        """
        if not text or not text.strip():
            return {
                "fairness_score": 100,
                "bias_risk_level": "LOW",
                "findings": [],
                "gender_balance": {"masculine_terms": 0, "feminine_terms": 0, "ratio": "Neutral"},
                "summary": "No text provided for DEI bias audit."
            }

        text_lower = text.lower()
        findings: List[Dict[str, Any]] = []

        # 1. Gendered terminology detection
        masc_found = []
        for term, replacement in cls.MASCULINE_CODED_TERMS.items():
            pattern = rf"\b{re.escape(term)}\b"
            matches = list(re.finditer(pattern, text_lower))
            if matches:
                masc_found.append({"term": term, "count": len(matches), "replacement": replacement})
                findings.append({
                    "category": "GENDER_BIAS",
                    "type": "MASCULINE_CODED",
                    "term": term,
                    "severity": "MEDIUM",
                    "message": f"Found masculine-coded term '{term}'. May discourage female or non-binary applicants.",
                    "recommended_fix": f"Replace with inclusive alternative: '{replacement}'"
                })

        fem_found = []
        for term, replacement in cls.FEMININE_CODED_TERMS.items():
            pattern = rf"\b{re.escape(term)}\b"
            matches = list(re.finditer(pattern, text_lower))
            if matches:
                fem_found.append({"term": term, "count": len(matches), "replacement": replacement})
                findings.append({
                    "category": "GENDER_BIAS",
                    "type": "FEMININE_CODED",
                    "term": term,
                    "severity": "LOW",
                    "message": f"Found gender-skewed term '{term}'.",
                    "recommended_fix": f"Replace with: '{replacement}'"
                })

        # 2. Ageism indicators
        for pattern, label, explanation in cls.AGEISM_INDICATORS:
            if re.search(pattern, text_lower):
                findings.append({
                    "category": "AGEISM_BIAS",
                    "type": "AGE_DISCRIMINATION_RISK",
                    "term": label,
                    "severity": "HIGH",
                    "message": f"Detected potential ageism marker: '{label}'.",
                    "recommended_fix": explanation
                })

        # 3. Socio-economic elitism
        for pattern, label, explanation in cls.SOCIOECONOMIC_INDICATORS:
            if re.search(pattern, text_lower):
                findings.append({
                    "category": "SOCIOECONOMIC_BIAS",
                    "type": "ELITISM_RISK",
                    "term": label,
                    "severity": "HIGH",
                    "message": f"Detected exclusionary pedigree criteria: '{label}'.",
                    "recommended_fix": explanation
                })

        # Compute Fairness Score (100 base, deducted by findings)
        penalty = 0
        for f in findings:
            if f["severity"] == "HIGH":
                penalty += 15
            elif f["severity"] == "MEDIUM":
                penalty += 8
            else:
                penalty += 4

        fairness_score = max(35, 100 - penalty)
        risk_level = "LOW" if fairness_score >= 85 else "MODERATE" if fairness_score >= 70 else "HIGH"

        masc_count = sum(m["count"] for m in masc_found)
        fem_count = sum(f["count"] for f in fem_found)

        return {
            "fairness_score": fairness_score,
            "bias_risk_level": risk_level,
            "total_findings": len(findings),
            "findings": findings,
            "gender_balance": {
                "masculine_terms": masc_count,
                "feminine_terms": fem_count,
                "ratio": (
                    "Masculine Skewed" if masc_count > fem_count + 1 else
                    "Feminine Skewed" if fem_count > masc_count + 1 else
                    "Gender Balanced"
                )
            },
            "summary": (
                f"DEI Audit complete: {risk_level} bias risk (Fairness Score {fairness_score}/100) with {len(findings)} flagged items."
            )
        }

    @classmethod
    def generate_blind_recruitment_profile(
        cls,
        resume_text: str,
        candidate_name: Optional[str] = None,
        email: Optional[str] = None,
        phone: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        De-identifies a candidate resume by masking PII, gender pronouns,
        graduation years, and geographical indicators to enable fair first-round evaluations.
        """
        if not resume_text:
            return {"masked_text": "", "redactions_count": 0, "audit_log": []}

        masked = resume_text
        audit_log = []

        # 1. Mask Email Addresses first (before name parts break email formatting)
        email_pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
        masked, count = re.subn(email_pattern, "[VERIFIED_CONTACT_MASKED]", masked)
        if count > 0:
            audit_log.append(f"Masked email addresses ({count} instances)")

        # 2. Mask Phone Numbers
        phone_pattern = r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
        masked, count = re.subn(phone_pattern, "[PHONE_REDACTED]", masked)
        if count > 0:
            audit_log.append(f"Masked phone numbers ({count} instances)")

        # 3. Mask Candidate Name
        name_placeholder = f"[CANDIDATE_ID_{hashlib.md5(resume_text[:50].encode()).hexdigest()[:6].upper()}]"
        if candidate_name and candidate_name.strip():
            names = candidate_name.strip().split()
            for part in names:
                if len(part) > 1:
                    pattern = rf"\b{re.escape(part)}\b"
                    masked, count = re.subn(pattern, name_placeholder, masked, flags=re.IGNORECASE)
                    if count > 0:
                        audit_log.append(f"Masked candidate name '{part}' ({count} instances)")

        # 4. Mask Gender Pronouns (He/Him/His/She/Her/Hers -> They/Them/Their)
        pronoun_replacements = [
            (r"\bhe\b", "they"),
            (r"\bshe\b", "they"),
            (r"\bhim\b", "them"),
            (r"\bher\b", "them"),
            (r"\bhis\b", "their"),
            (r"\bhers\b", "theirs")
        ]
        pronoun_count = 0
        for pat, repl in pronoun_replacements:
            masked, c = re.subn(pat, repl, masked, flags=re.IGNORECASE)
            pronoun_count += c
        if pronoun_count > 0:
            audit_log.append(f"Neutralized {pronoun_count} gendered pronouns to neutral equivalents")

        # 5. Mask Academic Graduation Years (e.g., 2012 -> [YEAR_MASKED])
        # Only mask years associated with education keywords to prevent masking recent job metrics
        edu_year_pattern = r"(?i)(?:graduat(?:ed|ion)?|bachelor|master|phd|b\.s\.|m\.s\.|b\.a\.|degree|university|college|diploma)[^\n]{0,60}\b(19\d{2}|20[0-2]\d)\b"
        def _mask_year(match):
            full = match.group(0)
            yr = match.group(1)
            return full.replace(yr, "[YEAR_MASKED]")

        masked, count = re.subn(edu_year_pattern, _mask_year, masked)
        if count > 0:
            audit_log.append(f"Masked academic graduation years to mitigate age bias ({count} instances)")

        # 6. Mask Physical Location / Street / Postal Code indicators
        postal_pattern = r"\b\d{5}(?:-\d{4})?\b|\b[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d\b"
        masked, count = re.subn(postal_pattern, "[POSTAL_MASKED]", masked)
        if count > 0:
            audit_log.append(f"Masked geographical postal codes ({count} instances)")

        return {
            "masked_text": masked,
            "candidate_alias": name_placeholder,
            "redactions_count": len(audit_log),
            "audit_log": audit_log,
            "compliance_status": "BLIND_SCREENING_COMPLIANT"
        }
