import re
from typing import Dict, Any, List
from app.services.parsing_service import KNOWN_TECH_SKILLS, KNOWN_SOFT_SKILLS

class MatchingService:
    @staticmethod
    def extract_job_skills(job_text: str) -> Dict[str, List[str]]:
        text_lower = job_text.lower()
        required = []
        preferred = []
        
        # Check for preferred or nice-to-have headers
        is_preferred_section = False
        lines = job_text.split("\n")
        
        all_skills = KNOWN_TECH_SKILLS + KNOWN_SOFT_SKILLS
        
        for line in lines:
            line_lower = line.lower()
            if any(term in line_lower for term in ["nice to have", "preferred qualifications", "bonus points", "plus:", "good to have"]):
                is_preferred_section = True
            elif any(term in line_lower for term in ["requirements", "required qualifications", "what you'll need", "minimum qualifications"]):
                is_preferred_section = False

            for skill in all_skills:
                pattern = r'\b' + re.escape(skill) + r'\b'
                if re.search(pattern, line_lower):
                    display_name = skill.title() if len(skill) > 3 and not skill in ["aws", "sql", "nlp", "llm", "gcp", "css3", "html5"] else skill.upper()
                    if is_preferred_section:
                        if display_name not in preferred and display_name not in required:
                            preferred.append(display_name)
                    else:
                        if display_name not in required:
                            required.append(display_name)
                            
        # If no split detected, partition top 70% as required, 30% as preferred
        if not preferred and len(required) > 4:
            split_idx = int(len(required) * 0.7)
            preferred = required[split_idx:]
            required = required[:split_idx]

        return {
            "required": required,
            "preferred": preferred
        }

    @staticmethod
    def match_resume_to_job(resume_text: str, resume_skills: List[Dict[str, Any]], job_text: str) -> Dict[str, Any]:
        extracted = MatchingService.extract_job_skills(job_text)
        req_skills = extracted["required"]
        pref_skills = extracted["preferred"]
        
        total_jd_skills = list(dict.fromkeys(req_skills + pref_skills))
        if not total_jd_skills:
            # Fallback scan for common keywords
            total_jd_skills = ["Communication", "Problem Solving", "Collaboration", "Python", "SQL"]
            req_skills = ["Communication", "Problem Solving", "Collaboration"]
            pref_skills = ["Python", "SQL"]

        resume_lower = resume_text.lower()
        matched = []
        missing = []
        partial = []
        
        # Candidate's skill names set
        candidate_skills_map = {s["name"].lower(): s for s in resume_skills if isinstance(s, dict) and "name" in s}

        for skill in total_jd_skills:
            skill_lower = skill.lower()
            pattern = r'\b' + re.escape(skill_lower) + r'\b'
            
            # Check direct match in resume text or skills list
            if re.search(pattern, resume_lower) or skill_lower in candidate_skills_map:
                # Find evidence line
                evidence = "Documented in candidate skills profile"
                for line in resume_text.split("\n"):
                    if skill_lower in line.lower():
                        evidence = line.strip()[:140]
                        break
                matched.append({
                    "name": skill,
                    "is_required": skill in req_skills,
                    "evidence": evidence,
                    "match_type": "Exact Match"
                })
            else:
                # Check for partial / related matches
                is_partial = False
                related_map = {
                    "react": ["javascript", "frontend", "typescript"],
                    "typescript": ["javascript"],
                    "fastapi": ["python", "flask", "django"],
                    "docker": ["kubernetes", "ci/cd", "cloud"],
                    "postgresql": ["sql", "mysql"],
                    "aws": ["cloud", "gcp", "azure"]
                }
                
                if skill_lower in related_map:
                    for rel in related_map[skill_lower]:
                        if rel in resume_lower:
                            partial.append({
                                "name": skill,
                                "related_found": rel.title(),
                                "is_required": skill in req_skills
                            })
                            is_partial = True
                            break
                            
                if not is_partial:
                    missing.append({
                        "name": skill,
                        "is_required": skill in req_skills,
                        "recommendation": f"Add concrete projects or hands-on experience involving {skill} if you have working knowledge."
                    })

        # Calculate scores
        total_count = max(len(total_jd_skills), 1)
        matched_weight = sum(2.0 if m["is_required"] else 1.0 for m in matched)
        total_weight = sum(2.0 if s in req_skills else 1.0 for s in total_jd_skills)
        partial_weight = len(partial) * 0.5
        
        coverage_score = min(100.0, round(((matched_weight + partial_weight) / max(total_weight, 1.0)) * 100, 1))
        
        # Relevance based on keyword overlap
        relevance_score = min(100.0, round(coverage_score * 0.9 + 10.0, 1))
        structure_score = 88.0
        readability_score = 85.0
        
        overall_score = round(
            (coverage_score * 0.50) +
            (relevance_score * 0.30) +
            (structure_score * 0.10) +
            (readability_score * 0.10),
            1
        )

        match_explanations = [
            f"Candidate profile satisfies {len(matched)} of {len(total_jd_skills)} target job competencies.",
            f"Matched {sum(1 for m in matched if m['is_required'])} out of {len(req_skills)} required core requirements.",
            f"{len(missing)} key requirements were not detected in the current resume text.",
            "Scoring is strictly an algorithmic alignment indicator, not an official ATS pass/fail decision."
        ]

        recommendations = []
        if missing:
            top_missing = [m['name'] for m in missing[:3]]
            recommendations.append(f"Consider highlighting experience with: {', '.join(top_missing)}.")
        if partial:
            recommendations.append(f"Bridge related skills: You have background in {[p['related_found'] for p in partial[:2]]}; specify if this includes {partial[0]['name']}.")
        recommendations.append("Tailor your professional summary to explicitly reference the job title and primary domain.")

        return {
            "overall_score": overall_score,
            "structure_score": structure_score,
            "readability_score": readability_score,
            "skills_coverage_score": coverage_score,
            "relevance_score": relevance_score,
            "matched_skills": matched,
            "missing_skills": missing,
            "partial_skills": partial,
            "match_explanations": match_explanations,
            "recommendations": recommendations
        }
