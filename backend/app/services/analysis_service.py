import re
from typing import Dict, Any, List

VAGUE_PATTERNS = [
    {
        "pattern": r'\b(?:responsible for|was responsible for)\b',
        "phrase": "responsible for",
        "suggestion": "Spearheaded, Orchestrated, or Delivered",
        "reason": "Passive phrase that only states duty rather than active leadership, ownership, and contribution."
    },
    {
        "pattern": r'\b(?:helped with|assisted in|assisted with)\b',
        "phrase": "helped with / assisted in",
        "suggestion": "Co-engineered, Partnered to deliver, or Facilitated",
        "reason": "Minimizes your direct ownership. Specify your exact role in the collaborative initiative."
    },
    {
        "pattern": r'\b(?:worked on|worked with)\b',
        "phrase": "worked on",
        "suggestion": "Architected, Developed, Implemented, or Built",
        "reason": "Generic phrase that lacks impact. Use precise technical action verbs that define what you produced."
    },
    {
        "pattern": r'\b(?:handled|handled all)\b',
        "phrase": "handled",
        "suggestion": "Managed, Resolved, Administered, or Streamlined",
        "reason": "Vague conversational verb. Clarify the methodology and volume of items processed."
    },
    {
        "pattern": r'\b(?:hard-working|hard working|team player)\b',
        "phrase": "team player / hard worker",
        "suggestion": "Demonstrate cross-functional outcomes (e.g. 'Collaborated with 4 cross-functional teams to deploy...')",
        "reason": "Overused subjective buzzwords. Replace self-praise with measurable, factual evidence."
    },
    {
        "pattern": r'\b(?:familiar with)\b',
        "phrase": "familiar with",
        "suggestion": "Utilized [Skill] to build [Outcome], or Proficient in",
        "reason": "Signals superficial knowledge. Better to highlight what you built with the technology."
    }
]

STRONG_ACTION_VERBS = [
    "spearheaded", "engineered", "architected", "delivered", "optimized", "increased",
    "reduced", "accelerated", "designed", "streamlined", "implemented", "authored",
    "scaled", "orchestrated", "automated", "mentored", "negotiated", "secured"
]

METRIC_PATTERNS = [
    r'\b\d+%\b',
    r'\$\s?\d+(?:,\d+)*(?:\.\d+)?(?:\s?(?:k|m|million|billion|b))?',
    r'\b\d+\s?(?:ms|s|seconds|x|times|users|clients|customers|engineers|projects|applications)\b',
    r'\b(?:increased|reduced|decreased|improved|grew|saved)\s+by\s+\d+',
    r'\b(?:from|to)\s+\d+'
]

class AnalysisService:
    @staticmethod
    def analyze_resume(parsed_data: Dict[str, Any], raw_text: str) -> Dict[str, Any]:
        text_lower = raw_text.lower()
        lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
        
        # 1. Structure Audit
        has_contact = bool(parsed_data.get("contact", {}).get("email"))
        has_phone = bool(parsed_data.get("contact", {}).get("phone"))
        has_summary = bool(parsed_data.get("summary") and len(parsed_data["summary"].strip()) > 30)
        has_experience = bool(parsed_data.get("experience") and len(parsed_data["experience"]) > 0)
        has_education = bool(parsed_data.get("education") and len(parsed_data["education"]) > 0)
        has_skills = bool(parsed_data.get("skills") and len(parsed_data["skills"]) >= 3)
        has_projects = bool(parsed_data.get("projects") and len(parsed_data["projects"]) > 0)
        
        structure_points = 0
        if has_contact: structure_points += 20
        if has_phone: structure_points += 10
        if has_summary: structure_points += 15
        if has_experience: structure_points += 25
        if has_education: structure_points += 15
        if has_skills: structure_points += 15
        structure_score = min(100.0, float(structure_points))

        # 2. Impact & Measurable Achievements
        metrics_found = []
        for pat in METRIC_PATTERNS:
            matches = re.findall(pat, raw_text, re.IGNORECASE)
            metrics_found.extend(matches)
        
        action_verbs_found = [verb for verb in STRONG_ACTION_VERBS if re.search(r'\b' + verb + r'\b', text_lower)]
        
        # Calculate impact score
        impact_score = min(100.0, (len(metrics_found) * 15.0) + (len(action_verbs_found) * 8.0))
        if impact_score < 30 and has_experience:
            impact_score = 35.0  # Baseline

        # 3. Readability & Clarity
        # Average sentence / bullet length
        words = raw_text.split()
        total_words = len(words)
        avg_line_words = (total_words / max(len(lines), 1)) if lines else 10
        
        # Penalize if too dense (> 25 words/line) or too sparse (< 4 words/line)
        readability_score = 85.0
        if avg_line_words > 24:
            readability_score -= 20.0
        elif avg_line_words < 5:
            readability_score -= 10.0
            
        if total_words < 120:
            readability_score -= 30.0  # Too short
        elif total_words > 1200:
            readability_score -= 15.0  # Likely exceeds 2-page sweet spot

        # 4. Skills Score
        skills_count = len(parsed_data.get("skills", []))
        skills_score = min(100.0, max(20.0, float(skills_count * 6.5)))

        # 5. Overall Weighted Score
        overall_score = round(
            (structure_score * 0.25) +
            (readability_score * 0.20) +
            (impact_score * 0.35) +
            (skills_score * 0.20),
            1
        )

        # 6. Vague Phrases Detection
        vague_findings = []
        for v in VAGUE_PATTERNS:
            matches = list(re.finditer(v["pattern"], raw_text, re.IGNORECASE))
            for m in matches:
                # Get snippet
                start = max(0, m.start() - 40)
                end = min(len(raw_text), m.end() + 40)
                snippet = raw_text[start:end].replace("\n", " ").strip()
                vague_findings.append({
                    "phrase": v["phrase"],
                    "context": f"...{snippet}...",
                    "suggestion": v["suggestion"],
                    "reason": v["reason"]
                })

        # 7. Strengths & Weaknesses
        strengths = []
        weaknesses = []
        recommendations = []

        if structure_score >= 80:
            strengths.append("Comprehensive resume structure with clear section categorization.")
        else:
            weaknesses.append("Missing core sections or contact details (e.g. Summary or LinkedIn profile).")
            recommendations.append({
                "category": "formatting",
                "title": "Complete Section Architecture",
                "description": "Ensure your resume features Contact, Professional Summary, Experience, Skills, and Education headers.",
                "priority": "high"
            })

        if len(metrics_found) >= 4:
            strengths.append(f"Strong quantification: Identified {len(metrics_found)} measurable impact metrics and KPIs.")
        else:
            weaknesses.append("Insufficient quantified results. Many bullets state activities rather than measurable outcomes.")
            recommendations.append({
                "category": "impact",
                "title": "Adopt the XYZ Formula",
                "description": "Rewrite experience bullets as: 'Accomplished [X] as measured by [Y] by doing [Z]'. Add percentages, performance gains, or user volume.",
                "priority": "high"
            })

        if len(action_verbs_found) >= 5:
            strengths.append(f"Dynamic vocabulary: Detected strong active verbs including {', '.join(action_verbs_found[:4])}.")
        else:
            weaknesses.append("Frequent reliance on passive or generic responsibility descriptors.")
            recommendations.append({
                "category": "clarity",
                "title": "Replace Passive Language",
                "description": "Start every bullet with a high-impact verb (e.g. Architected, Optimized, Spearheaded) instead of 'Responsible for'.",
                "priority": "medium"
            })

        if skills_count >= 8:
            strengths.append(f"Diverse technical stack: Documented {skills_count} recognizable domain skills.")
        else:
            weaknesses.append("Limited explicit skill keywords detected, which may affect role alignment.")
            recommendations.append({
                "category": "skills",
                "title": "Expand Core Competencies",
                "description": "Group your hard skills into categorised sections (e.g., Languages, Frameworks, Cloud & DevOps, Databases).",
                "priority": "medium"
            })

        section_breakdown = {
            "contact": {"status": "good" if has_contact and has_phone else "needs_work", "items": parsed_data.get("contact")},
            "summary": {"status": "good" if has_summary else "needs_work", "length": len(parsed_data.get("summary", ""))},
            "experience": {"status": "good" if has_experience and len(metrics_found) >= 2 else "needs_work", "count": len(parsed_data.get("experience", []))},
            "skills": {"status": "good" if skills_count >= 6 else "needs_work", "count": skills_count},
            "education": {"status": "good" if has_education else "needs_work", "count": len(parsed_data.get("education", []))}
        }

        findings = [
            f"Overall health rating: {overall_score}/100.",
            f"Identified {len(metrics_found)} quantified impact indicators.",
            f"Detected {len(vague_findings)} opportunities to replace vague phrasing with high-impact action verbs.",
            f"Scanned {len(parsed_data.get('skills', []))} industry-relevant skills across the document."
        ]

        return {
            "overall_score": overall_score,
            "structure_score": structure_score,
            "readability_score": readability_score,
            "impact_score": impact_score,
            "skills_score": skills_score,
            "findings": findings,
            "vague_phrases": vague_findings[:10],
            "strengths": strengths,
            "weaknesses": weaknesses,
            "recommendations": recommendations,
            "section_breakdown": section_breakdown
        }

