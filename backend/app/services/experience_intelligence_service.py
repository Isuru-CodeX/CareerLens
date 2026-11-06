"""app/services/experience_intelligence_service.py
Deterministic Experience Intelligence Engine:
- Multi-variant section detection (Work History, Employment, Internships, Projects, etc.)
- Strict separation of professional employment, internships, freelance, academic projects, and personal projects
- Normalized date parsing across all standard resume date formats
- Calendar month duration calculations with inclusive convention
- Overlap detection and non-double-counted timeline consolidation
"""
import re
import datetime
from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy.orm import Session
from app.models.models import Resume, ResumeExperience

MONTHS_MAP = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12
}

SECTION_PATTERNS = {
    "professional_employment": re.compile(
        r"^(?:(?:professional|work|career)\s+(?:experience|history|background)|employment(?:\s+history)?|work\s+history|experience)$",
        re.I
    ),
    "internship": re.compile(
        r"^(?:internships?|internship\s+experience|trainee\s+experience)$",
        re.I
    ),
    "freelance": re.compile(
        r"^(?:freelance(?:\s+work|\s+experience)?|contract\s+(?:work|roles?)|consulting\s+experience)$",
        re.I
    ),
    "volunteer": re.compile(
        r"^(?:volunteer(?:\s+work|\s+experience)?|community\s+service)$",
        re.I
    ),
    "academic_project": re.compile(
        r"^(?:academic\s+projects?|university\s+projects?|coursework\s+projects?)$",
        re.I
    ),
    "personal_project": re.compile(
        r"^(?:personal\s+projects?|side\s+projects?|independent\s+projects?|projects?)$",
        re.I
    ),
    "education": re.compile(
        r"^(?:education|academic\s+background|degrees?|qualifications?)$",
        re.I
    ),
    "skills": re.compile(
        r"^(?:skills|technical\s+skills|core\s+competencies|technologies)$",
        re.I
    ),
    "certifications": re.compile(
        r"^(?:certifications?|licenses?|credentials?)$",
        re.I
    )
}

# Regex for matching date ranges:
# Jan 2023 - Present
# January 2023 - December 2024
# 01/2023 - 12/2024
# 2023-01 - 2024-12
# 2023 - 2024
DATE_TOKEN = r'(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[a-z]*\.?\s+)?(?:19|20)\d{2}|(?:\d{1,2}/\s*(?:19|20)\d{2})|(?:(?:19|20)\d{2}-\d{1,2})|(?:(?:19|20)\d{2})'
RANGE_REGEX = re.compile(
    rf'({DATE_TOKEN})\s*(?:-|–|—|to)\s*({DATE_TOKEN}|present|current|now|ongoing)',
    re.I
)

class ExperienceIntelligenceService:
    @classmethod
    def parse_single_date(cls, tok: str) -> Tuple[Optional[int], Optional[int], bool]:
        """
        Parses a date token into (year, month, is_approximate).
        Returns (year, month, is_approximate). If only year is given, month is None and approximate is True.
        """
        tok = tok.strip()
        if not tok:
            return None, None, False

        # Format: 2023-01
        m_iso = re.match(r'^((?:19|20)\d{2})-(\d{1,2})$', tok)
        if m_iso:
            y = int(m_iso.group(1))
            m = max(1, min(12, int(m_iso.group(2))))
            return y, m, False

        # Format: 01/2023
        m_slash = re.match(r'^(\d{1,2})/\s*((?:19|20)\d{2})$', tok)
        if m_slash:
            m = max(1, min(12, int(m_slash.group(1))))
            y = int(m_slash.group(2))
            return y, m, False

        # Format: Jan 2023 or January 2023
        m_month_year = re.match(r'^([a-zA-Z]+)\.?\s+((?:19|20)\d{2})$', tok)
        if m_month_year:
            m_str = m_month_year.group(1).lower()
            y = int(m_month_year.group(2))
            m = MONTHS_MAP.get(m_str[:3])
            return y, m, False

        # Format: 2023 (year only)
        m_year_only = re.match(r'^((?:19|20)\d{2})$', tok)
        if m_year_only:
            return int(m_year_only.group(1)), None, True

        return None, None, False

    @classmethod
    def calculate_duration_months(
        cls,
        start_year: Optional[int],
        start_month: Optional[int],
        end_year: Optional[int],
        end_month: Optional[int],
        is_current: bool = False
    ) -> Tuple[int, bool]:
        """
        Calculates inclusive calendar months between start and end date.
        If is_current is True, computes through current month.
        Returns (months, is_approximate).
        """
        now = datetime.date.today()
        if not start_year:
            return 0, False

        s_month = start_month or 1
        approx = (start_month is None)

        if is_current:
            e_year = now.year
            e_month = now.month
        elif end_year:
            e_year = end_year
            e_month = end_month or 12
            if end_month is None:
                approx = True
        else:
            e_year = s_year = start_year
            e_month = s_month

        total_months = (e_year - start_year) * 12 + (e_month - s_month) + 1
        return max(1, total_months), approx

    @classmethod
    def format_duration(cls, months: int) -> str:
        if months <= 0:
            return "0 months"
        years = months // 12
        rem_months = months % 12
        parts = []
        if years > 0:
            parts.append(f"{years} year{'s' if years > 1 else ''}")
        if rem_months > 0 or years == 0:
            parts.append(f"{rem_months} month{'s' if rem_months != 1 else ''}")
        return " ".join(parts)

    @classmethod
    def detect_category_from_text(cls, text: str, default_cat: str) -> Tuple[str, str]:
        """
        Identifies employment type and experience category from title/company/header clues.
        """
        low = text.lower()
        
        # Category checks
        category = default_cat
        if any(w in low for w in ("intern", "internship", "trainee")):
            category = "internship"
        elif any(w in low for w in ("freelance", "freelancer")):
            category = "freelance"
        elif any(w in low for w in ("volunteer", "pro bono")):
            category = "volunteer"
        elif any(w in low for w in ("academic project", "coursework project", "university project")):
            category = "academic_project"
        elif any(w in low for w in ("personal project", "open source project", "side project", "hackathon")):
            category = "personal_project"

        # Employment type
        emp_type = "full_time"
        if "part-time" in low or "part time" in low:
            emp_type = "part_time"
        elif category == "internship":
            emp_type = "internship"
        elif category == "freelance" or "contract" in low or "contractor" in low:
            emp_type = "contract" if "contract" in low else "freelance"
        elif "self-employed" in low or "founder" in low or "co-founder" in low:
            emp_type = "self_employment"
        elif category == "volunteer":
            emp_type = "volunteer"
        elif "project" in category:
            emp_type = "unknown"

        return category, emp_type

    @classmethod
    def extract_experiences_from_text(cls, raw_text: str) -> List[Dict[str, Any]]:
        """
        Parses text lines, identifies experience sections, parses individual roles,
        extracts dates, responsibilities, and evidence.
        """
        lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
        current_section = "general"
        sections_data: Dict[str, List[str]] = {
            "professional_employment": [],
            "internship": [],
            "freelance": [],
            "volunteer": [],
            "academic_project": [],
            "personal_project": [],
            "education": [],
            "other": []
        }

        # 1. Segment document into sections
        for line in lines:
            # Check if this line is a heading
            clean_hdr = re.sub(r"^#+\s*", "", line).strip()
            clean_hdr = re.sub(r"[:\-_]+$", "", clean_hdr).strip()

            matched_sec = None
            for sec_name, pattern in SECTION_PATTERNS.items():
                if pattern.match(clean_hdr):
                    matched_sec = sec_name
                    break

            if matched_sec:
                current_section = matched_sec
                continue

            # Route line into active section
            target = current_section if current_section in sections_data else "other"
            sections_data[target].append(line)

        # 2. Extract entries from valid experience sections (never education)
        extracted_entries: List[Dict[str, Any]] = []
        valid_sections = [
            "professional_employment",
            "internship",
            "freelance",
            "volunteer",
            "academic_project",
            "personal_project"
        ]

        for sec in valid_sections:
            sec_lines = sections_data.get(sec, [])
            if not sec_lines:
                continue

            entries_in_sec = cls._parse_section_lines(sec_lines, default_category=sec)
            extracted_entries.extend(entries_in_sec)

        # If no entries found in designated sections, scan general body for date ranges
        if not extracted_entries:
            all_lines = sections_data.get("other", [])
            entries_in_sec = cls._parse_section_lines(all_lines, default_category="professional_employment")
            extracted_entries.extend(entries_in_sec)

        return extracted_entries

    @classmethod
    def _parse_section_lines(cls, lines: List[str], default_category: str) -> List[Dict[str, Any]]:
        entries: List[Dict[str, Any]] = []
        current_entry: Optional[Dict[str, Any]] = None

        for idx, line in enumerate(lines):
            # Check for date range on this line
            m_date = RANGE_REGEX.search(line)
            if m_date:
                # Save previous entry
                if current_entry and current_entry.get("company"):
                    entries.append(current_entry)

                start_raw = m_date.group(1).strip()
                end_raw = m_date.group(2).strip()
                is_current = bool(re.search(r"present|current|now|ongoing", end_raw, re.I))

                sy, sm, s_approx = cls.parse_single_date(start_raw)
                ey, em, e_approx = (None, None, False) if is_current else cls.parse_single_date(end_raw)

                dur_months, dur_approx = cls.calculate_duration_months(sy, sm, ey, em, is_current)

                # Look at line before or remainder of line for Role and Company
                line_without_dates = RANGE_REGEX.sub("", line).strip()
                prev_line = lines[idx - 1] if idx > 0 else ""

                role, company, loc = cls._extract_role_and_company(line_without_dates, prev_line)
                category, emp_type = cls.detect_category_from_text(f"{role} {company} {line}", default_category)

                confidence = 0.9 if (role and company and sy) else 0.65
                needs_verify = (not role or not company or s_approx or dur_approx or confidence < 0.75)

                current_entry = {
                    "job_title": role or "Software Role",
                    "company": company or "Organization",
                    "employment_type": emp_type,
                    "experience_category": category,
                    "start_date_str": start_raw,
                    "end_date_str": "Present" if is_current else end_raw,
                    "start_year": sy,
                    "start_month": sm,
                    "end_year": ey,
                    "end_month": em,
                    "is_current": is_current,
                    "duration_months": dur_months,
                    "responsibilities": [],
                    "location": loc,
                    "source_evidence": line[:250],
                    "extraction_confidence": confidence,
                    "needs_user_verification": needs_verify,
                    "verified_by_user": False
                }
            else:
                # If bullet point or responsibility statement
                if current_entry:
                    if re.match(r"^[-*•]\s*", line) or len(line) > 25:
                        clean_bullet = re.sub(r"^[-*•]\s*", "", line).strip()
                        if clean_bullet and clean_bullet not in current_entry["responsibilities"]:
                            current_entry["responsibilities"].append(clean_bullet)

        if current_entry and current_entry.get("company"):
            entries.append(current_entry)

        return entries

    @classmethod
    def _extract_role_and_company(cls, line_without_date: str, prev_line: str) -> Tuple[str, str, Optional[str]]:
        """
        Parses common CV header patterns:
        - Role at Company — Location
        - Role | Company | Location
        - Company — Role
        """
        candidate_text = line_without_date or prev_line
        role = ""
        company = ""
        location = None

        # Pattern: "Role at Company"
        m_at = re.match(r"^(.*?)\s+at\s+(.*?)(?:\s*[-—–|]\s*(.*?))?$", candidate_text, re.I)
        if m_at:
            role = m_at.group(1).strip()
            company = m_at.group(2).strip()
            location = m_at.group(3).strip() if m_at.group(3) else None
            return role, company, location

        # Pattern: "Role | Company" or "Company — Role"
        parts = [p.strip() for p in re.split(r"[-—–|•,]", candidate_text) if p.strip()]
        if len(parts) >= 2:
            # Check which part looks like a job title
            p0_lower = parts[0].lower()
            if any(w in p0_lower for w in ("engineer", "developer", "manager", "lead", "analyst", "designer", "consultant", "intern")):
                role = parts[0]
                company = parts[1]
                location = parts[2] if len(parts) > 2 else None
            else:
                company = parts[0]
                role = parts[1]
                location = parts[2] if len(parts) > 2 else None
        elif len(parts) == 1:
            role = parts[0]
            company = "Employer"

        return role, company, location

    @classmethod
    def compute_non_overlapping_duration(
        cls,
        experiences: List[Any],
        categories: Optional[List[str]] = None
    ) -> Tuple[int, int, int]:
        """
        Consolidates intervals [start_month_index, end_month_index] to prevent double-counting.
        Returns: (consolidated_months, total_sum_months, overlap_months_adjusted).
        """
        filtered = [
            e for e in experiences
            if not categories or (getattr(e, "experience_category", None) or e.get("experience_category")) in categories
        ]
        if not filtered:
            return 0, 0, 0

        now = datetime.date.today()
        intervals: List[Tuple[int, int]] = []
        total_sum = 0

        for e in filtered:
            sy = getattr(e, "start_year", None) if hasattr(e, "start_year") else e.get("start_year")
            sm = (getattr(e, "start_month", None) if hasattr(e, "start_month") else e.get("start_month")) or 1
            is_cur = getattr(e, "is_current", False) if hasattr(e, "is_current") else e.get("is_current", False)
            ey = getattr(e, "end_year", None) if hasattr(e, "end_year") else e.get("end_year")
            em = (getattr(e, "end_month", None) if hasattr(e, "end_month") else e.get("end_month")) or 12

            if not sy:
                continue

            start_idx = sy * 12 + sm
            if is_cur:
                end_idx = now.year * 12 + now.month
            elif ey:
                end_idx = ey * 12 + em
            else:
                end_idx = start_idx

            if end_idx >= start_idx:
                intervals.append((start_idx, end_idx))
                total_sum += (end_idx - start_idx + 1)

        if not intervals:
            return 0, 0, 0

        intervals.sort(key=lambda x: (x[0], x[1]))
        merged: List[List[int]] = []
        for s, e in intervals:
            if merged and s <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], e)
            else:
                merged.append([s, e])

        consolidated_months = sum(e - s + 1 for s, e in merged)
        overlap_adjusted = max(0, total_sum - consolidated_months)
        return consolidated_months, total_sum, overlap_adjusted

    @classmethod
    def get_experience_summary(
        cls,
        experiences: List[Any],
        include_internships_in_relevant: bool = True
    ) -> Dict[str, Any]:
        """
        Produces the documented Experience Intelligence Summary.
        """
        pro_months, _, pro_overlap = cls.compute_non_overlapping_duration(
            experiences, categories=["professional_employment"]
        )
        intern_months, _, _ = cls.compute_non_overlapping_duration(
            experiences, categories=["internship"]
        )
        freelance_months, _, _ = cls.compute_non_overlapping_duration(
            experiences, categories=["freelance"]
        )

        academic_count = sum(
            1 for e in experiences
            if (getattr(e, "experience_category", None) or e.get("experience_category")) == "academic_project"
        )
        personal_count = sum(
            1 for e in experiences
            if (getattr(e, "experience_category", None) or e.get("experience_category")) == "personal_project"
        )

        # Relevant experience combination rule
        rel_categories = ["professional_employment"]
        if include_internships_in_relevant:
            rel_categories.append("internship")
        rel_categories.append("freelance")

        rel_months, _, _ = cls.compute_non_overlapping_duration(
            experiences, categories=rel_categories
        )

        non_overlapping_roles = len([
            e for e in experiences
            if (getattr(e, "experience_category", None) or e.get("experience_category")) == "professional_employment"
        ])

        basis = (
            f"{cls.format_duration(pro_months)} across {non_overlapping_roles} professional role{'s' if non_overlapping_roles != 1 else ''}"
            f"{f' ({pro_overlap} months overlap adjusted)' if pro_overlap > 0 else ''}"
        )

        return {
            "professional_duration_months": pro_months,
            "professional_duration_formatted": cls.format_duration(pro_months),
            "internship_duration_months": intern_months,
            "internship_duration_formatted": cls.format_duration(intern_months),
            "freelance_duration_months": freelance_months,
            "freelance_duration_formatted": cls.format_duration(freelance_months),
            "academic_projects_count": academic_count,
            "personal_projects_count": personal_count,
            "overlap_months_adjusted": pro_overlap,
            "non_overlapping_roles_count": non_overlapping_roles,
            "calculation_basis": basis,
            "relevant_experience_duration_months": rel_months,
            "relevant_experience_formatted": cls.format_duration(rel_months)
        }

    @classmethod
    def extract_and_save_experiences(cls, db: Session, resume: Resume) -> List[ResumeExperience]:
        """
        Executes Experience Intelligence pipeline on a resume and stores structured records.
        """
        # Delete existing auto-extracted experiences to replace with clean intelligence
        db.query(ResumeExperience).filter(ResumeExperience.resume_id == resume.id).delete()

        entries = cls.extract_experiences_from_text(resume.raw_text or "")
        records = []
        for e in entries:
            rec = ResumeExperience(
                resume_id=resume.id,
                job_title=e.get("job_title"),
                company=e.get("company"),
                employment_type=e.get("employment_type", "full_time"),
                experience_category=e.get("experience_category", "professional_employment"),
                start_date_str=e.get("start_date_str"),
                end_date_str=e.get("end_date_str"),
                start_year=e.get("start_year"),
                start_month=e.get("start_month"),
                end_year=e.get("end_year"),
                end_month=e.get("end_month"),
                is_current=e.get("is_current", False),
                duration_months=e.get("duration_months", 0),
                responsibilities=e.get("responsibilities", []),
                location=e.get("location"),
                source_evidence=e.get("source_evidence"),
                extraction_confidence=e.get("extraction_confidence", 0.85),
                needs_user_verification=e.get("needs_user_verification", False),
                verified_by_user=False
            )
            db.add(rec)
            records.append(rec)

        db.commit()
        for r in records:
            db.refresh(r)
        return records
