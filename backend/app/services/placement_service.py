"""
backend/app/services/placement_service.py
-----------------------------------------
Module 12: University Placement Cell & Multi-Tenant Career Services Portal.
Implements:
1. Cohort readiness telemetry & skill deficit aggregation.
2. Student / Mentor / Placement Officer multi-tenant role capabilities.
3. Candidate roster filtering and verified candidate batch exports.
"""

from typing import Dict, Any, List, Optional


class PlacementService:
    """
    Enterprise SaaS and university placement cell portal service.
    Aggregates batch readiness metrics, identifies systemic curriculum deficits,
    and manages campus recruiter candidate rosters.
    """

    MOCK_COHORT_STUDENTS = [
        {"id": "std_101", "name": "Aarav Sharma", "email": "aarav.s@university.edu", "degree": "B.S. Computer Science", "batch": "Class of 2026", "target_role": "Backend Engineer", "readiness_score": 88, "interview_score": 85, "verified_skills": ["Python", "FastAPI", "PostgreSQL", "Docker"], "status": "Interviewing", "offers": 1},
        {"id": "std_102", "name": "Elena Rostova", "email": "elena.r@university.edu", "degree": "B.S. Software Engineering", "batch": "Class of 2026", "target_role": "Full Stack Developer", "readiness_score": 92, "interview_score": 90, "verified_skills": ["TypeScript", "React", "Node.js", "Redis"], "status": "Offer Received", "offers": 2},
        {"id": "std_103", "name": "Marcus Vance", "email": "marcus.v@university.edu", "degree": "M.S. Data Science", "batch": "Class of 2026", "target_role": "Machine Learning Engineer", "readiness_score": 79, "interview_score": 74, "verified_skills": ["Python", "PyTorch", "SQL", "Pandas"], "status": "Needs Mentorship", "offers": 0},
        {"id": "std_104", "name": "Chloe Dupont", "email": "chloe.d@university.edu", "degree": "B.S. Computer Science", "batch": "Class of 2026", "target_role": "Cloud / DevOps Engineer", "readiness_score": 84, "interview_score": 82, "verified_skills": ["AWS", "Docker", "Kubernetes", "Linux"], "status": "Interviewing", "offers": 1},
        {"id": "std_105", "name": "Devon Patel", "email": "devon.p@university.edu", "degree": "B.S. Information Systems", "batch": "Class of 2026", "target_role": "Security Analyst", "readiness_score": 73, "interview_score": 70, "verified_skills": ["Linux", "Wireshark", "Python", "Networking"], "status": "Exploring", "offers": 0},
        {"id": "std_106", "name": "Sophia Chen", "email": "sophia.c@university.edu", "degree": "B.S. Computer Science", "batch": "Class of 2026", "target_role": "Frontend Architect", "readiness_score": 95, "interview_score": 94, "verified_skills": ["React 19", "Next.js", "Tailwind", "TypeScript"], "status": "Placed", "offers": 3}
    ]

    SKILL_DEFICIT_ALERTS = [
        {
            "skill": "Kubernetes & Cloud Native Orchestration",
            "demand_percentage": 78,
            "cohort_proficiency": 28,
            "deficit_gap": 50,
            "severity": "CRITICAL",
            "recommendation": "68% of computer science students lack container orchestration skills demanded by incoming recruiters. Schedule Cloud Native workshop."
        },
        {
            "skill": "Production CI/CD Pipelines (GitHub Actions / GitLab)",
            "demand_percentage": 85,
            "cohort_proficiency": 42,
            "deficit_gap": 43,
            "severity": "HIGH",
            "recommendation": "Incoming enterprise partners require automated testing CI/CD proficiency. Introduce pipeline milestone project."
        },
        {
            "skill": "System Design & Distributed Data Stores (Kafka / Redis)",
            "demand_percentage": 70,
            "cohort_proficiency": 35,
            "deficit_gap": 35,
            "severity": "MODERATE",
            "recommendation": "Offer system design mock interviews to boost L2/L3 role conversion rates."
        }
    ]

    @classmethod
    def get_cohort_telemetry(cls, batch: str = "Class of 2026") -> Dict[str, Any]:
        """
        Calculates aggregate readiness telemetry across candidate batches.
        """
        students = [s for s in cls.MOCK_COHORT_STUDENTS if s["batch"] == batch or batch == "all"]
        if not students:
            students = cls.MOCK_COHORT_STUDENTS

        total = len(students)
        avg_readiness = round(sum(s["readiness_score"] for s in students) / total, 1)
        avg_interview = round(sum(s["interview_score"] for s in students) / total, 1)
        placed_count = sum(1 for s in students if s["status"] in ["Placed", "Offer Received"])
        placement_rate = round((placed_count / total) * 100, 1)

        return {
            "batch_name": batch,
            "total_students": total,
            "average_ats_readiness": avg_readiness,
            "average_interview_score": avg_interview,
            "placed_students_count": placed_count,
            "placement_rate_percentage": placement_rate,
            "active_interviews_ongoing": sum(1 for s in students if s["status"] == "Interviewing"),
            "skill_deficit_alerts": cls.SKILL_DEFICIT_ALERTS,
            "top_recruiter_partners": ["Stripe", "Amazon Web Services", "Datadog", "Snowflake", "Google", "Microsoft"],
            "students": students
        }

    @classmethod
    def export_csv(cls, batch: str = "Class of 2026") -> str:
        """
        Exports cohort roster into CSV format for university placement officers and corporate partners.
        """
        students = cls.MOCK_COHORT_STUDENTS
        headers = ["Student ID", "Name", "Email", "Degree", "Target Role", "Readiness Score", "Interview Score", "Verified Skills", "Placement Status", "Offers"]
        rows = [",".join(headers)]
        for s in students:
            skills = ";".join(s["verified_skills"])
            rows.append(f'"{s["id"]}","{s["name"]}","{s["email"]}","{s["degree"]}","{s["target_role"]}",{s["readiness_score"]},{s["interview_score"]},"{skills}","{s["status"]}",{s["offers"]}')
        return "\n".join(rows)

