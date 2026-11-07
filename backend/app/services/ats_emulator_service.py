"""
app/services/ats_emulator_service.py
------------------------------------
Pillar 1: 4-Tier Simulated ATS Stress-Test Engine.
Simulates real-world parsing filters for the top 4 Enterprise ATS platforms:
1. Workday (Table parsing distortions, header tags, bullet glyph compatibility)
2. Greenhouse (Multi-column reading order corruption, text layer extraction, skill tokenization)
3. Taleo (Oracle) (Legacy date chronology, ligatures/unreadable glyphs, section nesting)
4. Lever (Contact info extraction, hyperlink anchors, education hierarchy)
"""

import re
from typing import Dict, Any, List, Optional


class AtsEmulatorService:
    """
    Stress-tests candidate resumes against the 4 most prevalent Enterprise ATS systems.
    Evaluates layout compatibility, text stream serialization, and field extraction robustness.
    """

    @classmethod
    def evaluate_workday_ats(cls, raw_text: str) -> Dict[str, Any]:
        """
        Workday ATS Simulator:
        - Severe penalty for table formatting, tab delimiters, or missing standard headers.
        - Strict requirement for standard header tags (Work Experience, Education, Skills).
        - Tests for non-standard bullet characters that Workday renders as '?' or null bytes.
        """
        issues = []
        passed_checks = []
        score = 100

        # Check 1: Table-like tab delimiters or pipe delimiters
        pipe_count = raw_text.count("|")
        tab_count = raw_text.count("\t")
        if pipe_count > 8 or tab_count > 10:
            issues.append({
                "severity": "HIGH",
                "code": "WORKDAY_TABLE_DISTORTION",
                "message": f"Detected heavy table or column delimiters ({pipe_count} pipes, {tab_count} tabs). Workday's document parser frequently flattens table rows into scrambled text."
            })
            score -= 25
        else:
            passed_checks.append("No table layout or grid distortion detected.")

        # Check 2: Standard Workday Section Headers
        low = raw_text.lower()
        has_exp = any(h in low for h in ["work experience", "experience", "employment history", "professional experience"])
        has_edu = any(h in low for h in ["education", "academic background", "degrees"])
        has_skills = any(h in low for h in ["skills", "technical skills", "competencies", "core competencies"])

        if not has_exp:
            issues.append({
                "severity": "CRITICAL",
                "code": "WORKDAY_MISSING_EXP_HEADER",
                "message": "Missing standard 'Experience' header. Workday may fail to extract your job history timeline."
            })
            score -= 30
        else:
            passed_checks.append("Standard Work Experience section header successfully demarcated.")

        if not has_edu:
            issues.append({
                "severity": "MEDIUM",
                "code": "WORKDAY_MISSING_EDU_HEADER",
                "message": "Missing explicit 'Education' section tag. Academic credentials may require manual candidate entry."
            })
            score -= 15
        else:
            passed_checks.append("Standard Education header demarcated.")

        if not has_skills:
            issues.append({
                "severity": "MEDIUM",
                "code": "WORKDAY_MISSING_SKILLS_HEADER",
                "message": "No dedicated 'Skills' section detected. May hinder Workday automated keyword filtering."
            })
            score -= 10
        else:
            passed_checks.append("Standard Skills header demarcated.")

        # Check 3: Non-standard bullet glyphs (e.g. ❖, ➢, ➤, ★, ⚡)
        fancy_bullets = re.findall(r"[❖➢➤★⚡►✓✔■◆●]", raw_text)
        if len(fancy_bullets) > 3:
            issues.append({
                "severity": "LOW",
                "code": "WORKDAY_FANCY_BULLET_GLYPH",
                "message": f"Found {len(fancy_bullets)} decorative symbols or emoji glyphs. Workday's parser may replace these with garbled characters ('?' or '□'). Use standard bullets (• or -)."
            })
            score -= 10
        else:
            passed_checks.append("Standard bullet point glyphs used (clean UTF-8 compatibility).")

        return {
            "ats_name": "Workday",
            "score": max(10, min(100, score)),
            "status": "PASSED" if score >= 80 else ("WARNING" if score >= 60 else "FAILED"),
            "issues": issues,
            "passed_checks": passed_checks
        }

    @classmethod
    def evaluate_greenhouse_ats(cls, raw_text: str) -> Dict[str, Any]:
        """
        Greenhouse ATS Simulator:
        - Evaluates linear reading order (checks for multi-column corruption).
        - Tests skill tokenization and text layer density.
        """
        issues = []
        passed_checks = []
        score = 100

        lines = raw_text.splitlines()

        # Check 1: Multi-column reading order corruption
        # In multi-column resumes, short lines or fragmented phrases appear consecutively
        multi_col_signals = 0
        for i in range(len(lines) - 1):
            l1, l2 = lines[i].strip(), lines[i + 1].strip()
            # If two adjacent lines have 4+ space gaps or look like two side-by-side columns
            if re.search(r"\S\s{4,}\S", l1) or (10 < len(l1) < 25 and 10 < len(l2) < 25 and not l1.startswith(("-", "•"))):
                multi_col_signals += 1

        if multi_col_signals > 6:
            issues.append({
                "severity": "HIGH",
                "code": "GREENHOUSE_MULTI_COLUMN_CORRUPTION",
                "message": "Potential multi-column layout detected. Greenhouse parses resumes left-to-right across lines, which corrupts side-by-side columns into unreadable interleaved text."
            })
            score -= 25
        else:
            passed_checks.append("Clean single-column reading order verified.")

        # Check 2: Skill Tokenization Density
        # Greenhouse tokenizes comma-separated and bullet-separated technical skills
        comma_separated = len(re.findall(r"\b[A-Za-z0-9#+.]+\s*,\s*[A-Za-z0-9#+.]+", raw_text))
        if comma_separated < 3:
            issues.append({
                "severity": "LOW",
                "code": "GREENHOUSE_LOW_SKILL_TOKENIZATION",
                "message": "Skills do not appear in clearly tokenized comma-separated format. Greenhouse filters candidates by exact skill tokens."
            })
            score -= 10
        else:
            passed_checks.append("Skills cleanly structured for automated Greenhouse token matching.")

        # Check 3: Text Layer Density & Average Line Length
        long_unbroken = [line for line in lines if len(line.strip()) > 240]
        if len(long_unbroken) > 2:
            issues.append({
                "severity": "MEDIUM",
                "code": "GREENHOUSE_OVERLONG_PARAGRAPHS",
                "message": "Found overly dense unbulleted paragraphs (>240 chars). Recruiters reviewing in Greenhouse skim bullet points faster than dense text blocks."
            })
            score -= 10
        else:
            passed_checks.append("Well-proportioned line length and bullet density.")

        return {
            "ats_name": "Greenhouse",
            "score": max(10, min(100, score)),
            "status": "PASSED" if score >= 80 else ("WARNING" if score >= 60 else "FAILED"),
            "issues": issues,
            "passed_checks": passed_checks
        }

    @classmethod
    def evaluate_taleo_ats(cls, raw_text: str) -> Dict[str, Any]:
        """
        Oracle Taleo ATS Simulator:
        - Taleo's legacy parser is notoriously strict with date chronology (requires standard date patterns).
        - Penalizes font ligatures (fi, fl, ffi) and complex nesting.
        """
        issues = []
        passed_checks = []
        score = 100

        # Check 1: Date Chronology Parsing
        # Taleo looks for MM/YYYY - MM/YYYY or Month YYYY - Present
        date_matches = re.findall(
            r"(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{1,2}/\d{4}|\d{4})\s*[-–—to]+\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{1,2}/\d{4}|\d{4}|present|current)",
            raw_text,
            re.IGNORECASE
        )

        if len(date_matches) < 2:
            issues.append({
                "severity": "HIGH",
                "code": "TALEO_AMBIGUOUS_DATES",
                "message": "Only found " + str(len(date_matches)) + " standard date ranges. Taleo requires strict date chronology (e.g., '01/2022 - Present' or 'Jan 2022 - Present') to compute total years of experience."
            })
            score -= 25
        else:
            passed_checks.append(f"Detected {len(date_matches)} recognizable standard chronological date ranges.")

        # Check 2: Ligatures and Unicode Artifacts
        ligatures = re.findall(r"[ﬁﬂﬀﬃﬄ]", raw_text)
        if ligatures:
            issues.append({
                "severity": "MEDIUM",
                "code": "TALEO_FONT_LIGATURES",
                "message": f"Detected {len(ligatures)} typographic ligatures (e.g. 'ﬁ', 'ﬂ'). Taleo's legacy text extractor converts these into blank spaces or error tokens."
            })
            score -= 15
        else:
            passed_checks.append("Zero typographic ligatures detected; clean ASCII text extraction.")

        # Check 3: Deep nested sub-bullets
        nested_bullets = re.findall(r"^\s{6,}[-*•]", raw_text, re.MULTILINE)
        if len(nested_bullets) > 3:
            issues.append({
                "severity": "LOW",
                "code": "TALEO_DEEP_NESTING",
                "message": "Detected deeply nested sub-bullets (>6 leading spaces). Taleo often detaches sub-bullets from their parent role title."
            })
            score -= 10
        else:
            passed_checks.append("Flat, single-level hierarchy adheres to Taleo parsing constraints.")

        return {
            "ats_name": "Taleo (Oracle)",
            "score": max(10, min(100, score)),
            "status": "PASSED" if score >= 80 else ("WARNING" if score >= 60 else "FAILED"),
            "issues": issues,
            "passed_checks": passed_checks
        }

    @classmethod
    def evaluate_lever_ats(cls, raw_text: str) -> Dict[str, Any]:
        """
        Lever ATS Simulator:
        - Tests for clear contact info extraction (email, phone, LinkedIn/GitHub).
        - Tests for degree / credential hierarchy detection.
        - Checks for hyperlinking clarity.
        """
        issues = []
        passed_checks = []
        score = 100

        # Check 1: Candidate Email
        email_match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", raw_text)
        if not email_match:
            issues.append({
                "severity": "CRITICAL",
                "code": "LEVER_MISSING_EMAIL",
                "message": "No valid email address found in the text stream. Lever automatically creates candidate profiles based on parsed email."
            })
            score -= 35
        else:
            passed_checks.append(f"Candidate email detected: {email_match.group(0)}")

        # Check 2: Candidate Phone
        phone_match = re.search(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", raw_text)
        if not phone_match:
            issues.append({
                "severity": "LOW",
                "code": "LEVER_MISSING_PHONE",
                "message": "Phone number was not clearly identified in the header block."
            })
            score -= 10
        else:
            passed_checks.append("Contact telephone number clearly identifiable.")

        # Check 3: Professional Links (LinkedIn, GitHub, Portfolio)
        has_linkedin = "linkedin.com" in raw_text.lower()
        has_github = "github.com" in raw_text.lower()
        if not (has_linkedin or has_github):
            issues.append({
                "severity": "LOW",
                "code": "LEVER_NO_PORTFOLIO_LINKS",
                "message": "No LinkedIn or GitHub profile URLs detected. Lever recruiters rely heavily on auto-populated social profiles."
            })
            score -= 10
        else:
            passed_checks.append("Professional profile URLs (LinkedIn/GitHub) present.")

        # Check 4: Education Degree Detection
        degree_patterns = [
            r"\b(?:bachelor|master|b\.s|m\.s|b\.a|m\.a|ph\.d|doctorate|diploma)\b",
            r"\bcomputer science\b",
            r"\bengineering\b",
            r"\binformation technology\b"
        ]
        has_degree = any(re.search(pat, raw_text, re.IGNORECASE) for pat in degree_patterns)
        if not has_degree:
            issues.append({
                "severity": "MEDIUM",
                "code": "LEVER_DEGREE_UNCLEAR",
                "message": "Academic degree level (e.g. Bachelor of Science, Master's) was not explicitly recognized in standard format."
            })
            score -= 15
        else:
            passed_checks.append("Academic credential hierarchy recognized.")

        return {
            "ats_name": "Lever",
            "score": max(10, min(100, score)),
            "status": "PASSED" if score >= 80 else ("WARNING" if score >= 60 else "FAILED"),
            "issues": issues,
            "passed_checks": passed_checks
        }

    @classmethod
    def run_full_stress_test(cls, resume_text: str, file_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes a 4-tier stress test against Workday, Greenhouse, Taleo, and Lever.
        Returns a composite compatibility index, system scorecards, and prioritized mitigation checklist.
        """
        if not resume_text or len(resume_text.strip()) < 50:
            return {
                "overall_ats_score": 25,
                "overall_risk_rating": "CRITICAL PARSE FAILURE",
                "summary": "Resume contains insufficient text for ATS evaluation. File may be image-only (scanned PDF) or corrupted.",
                "system_scores": {
                    "workday": {"score": 25, "status": "FAILED"},
                    "greenhouse": {"score": 25, "status": "FAILED"},
                    "taleo": {"score": 25, "status": "FAILED"},
                    "lever": {"score": 25, "status": "FAILED"}
                },
                "all_issues": [{
                    "severity": "CRITICAL",
                    "ats": "All Systems",
                    "message": "Ensure PDF contains a selectable text layer (not flattened bitmap images)."
                }],
                "actionable_mitigation_checklist": [
                    "Export resume from Word or Google Docs directly as PDF (do not print-to-scan).",
                    "Verify text is selectable and copyable in a PDF reader."
                ]
            }

        workday = cls.evaluate_workday_ats(resume_text)
        greenhouse = cls.evaluate_greenhouse_ats(resume_text)
        taleo = cls.evaluate_taleo_ats(resume_text)
        lever = cls.evaluate_lever_ats(resume_text)

        # Composite Average Score
        composite_score = round((workday["score"] + greenhouse["score"] + taleo["score"] + lever["score"]) / 4)

        if composite_score >= 88:
            risk_rating = "PASS / LOW RISK"
            summary = "Excellent ATS compatibility! Your resume adheres strictly to enterprise parsing standards across all 4 major platforms."
        elif composite_score >= 72:
            risk_rating = "MODERATE RISK"
            summary = "Acceptable ATS parseability, but specific structural or glyph choices may cause minor field dropouts in Workday or Taleo."
        elif composite_score >= 55:
            risk_rating = "HIGH RISK"
            summary = "Significant parsing risk detected. Notable layout or date formatting discrepancies may lead to automatic ATS screening disqualification."
        else:
            risk_rating = "CRITICAL PARSE FAILURE"
            summary = "Severe ATS incompatibilities. Your resume is at high risk of being rejected or scrambled by automated candidate parsers."

        # Compile and prioritize all issues
        all_issues = []
        for sys in [workday, greenhouse, taleo, lever]:
            for issue in sys["issues"]:
                all_issues.append({
                    "system": sys["ats_name"],
                    "severity": issue["severity"],
                    "code": issue["code"],
                    "message": issue["message"]
                })

        # Sort issues by severity: CRITICAL > HIGH > MEDIUM > LOW
        severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        all_issues.sort(key=lambda x: severity_order.get(x["severity"], 4))

        # Actionable recommendations
        checklist = []
        seen_codes = set()
        for issue in all_issues:
            if issue["code"] not in seen_codes:
                seen_codes.add(issue["code"])
                checklist.append(f"[{issue['system']}] {issue['message']}")

        if not checklist:
            checklist.append("Your resume meets 100% of standard enterprise ATS parsing specifications.")

        return {
            "overall_ats_score": composite_score,
            "overall_risk_rating": risk_rating,
            "summary": summary,
            "file_name": file_name,
            "systems": {
                "workday": workday,
                "greenhouse": greenhouse,
                "taleo": taleo,
                "lever": lever
            },
            "all_issues": all_issues,
            "actionable_mitigation_checklist": checklist[:8]
        }

