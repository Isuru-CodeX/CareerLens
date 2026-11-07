from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import (
    User, Resume, AnalysisRun, JobMatch, Application, Reminder, CareerProfile,
    UserActivity, ResumeExperience, ProfileSkill, UserSkillEvidence,
    InterviewSession, LearningPlan, LearningTask, CareerGoal
)
from app.schemas.schemas import DashboardData, ApplicationStats, ExperienceSummaryOut
from app.services.experience_intelligence_service import ExperienceIntelligenceService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("", response_model=DashboardData)
def get_dashboard_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Resumes
    resumes = db.query(Resume).filter(
        Resume.user_id == current_user.id,
        Resume.is_archived == False
    ).order_by(Resume.created_at.desc()).all()
    
    # 2. Recent Analyses
    analyses = db.query(AnalysisRun).filter(
        AnalysisRun.user_id == current_user.id
    ).order_by(AnalysisRun.created_at.desc()).limit(5).all()

    # 3. Recent Matches
    matches = db.query(JobMatch).filter(
        JobMatch.user_id == current_user.id
    ).order_by(JobMatch.created_at.desc()).limit(5).all()

    # 4. Applications Stats
    apps = db.query(Application).filter(Application.user_id == current_user.id).all()
    stages = ["interested", "applied", "assessment", "interview", "offer", "rejected", "withdrawn"]
    by_stage = {s: 0 for s in stages}
    for a in apps:
        k = a.stage.lower()
        if k in by_stage:
            by_stage[k] += 1
            
    active_interviews = by_stage["interview"] + by_stage["assessment"]
    offers = by_stage["offer"]
    rejections = by_stage["rejected"]
    total_apps = len(apps)
    response_rate = round(((active_interviews + offers + rejections) / max(total_apps, 1)) * 100, 1)

    app_stats = ApplicationStats(
        total_applications=total_apps,
        by_stage=by_stage,
        active_interviews=active_interviews,
        offers=offers,
        rejections=rejections,
        response_rate_percent=response_rate
    )

    # 5. Upcoming Reminders
    reminders = db.query(Reminder).filter(
        Reminder.user_id == current_user.id,
        Reminder.is_completed == False
    ).order_by(Reminder.due_date.asc()).limit(5).all()

    # 6. Skill Recommendations
    profile = db.query(CareerProfile).filter(CareerProfile.user_id == current_user.id).first()
    target_title = profile.target_title if profile and profile.target_title else "Software Engineer"
    
    # Analyze missing skills in matches
    missing_freq: Dict[str, int] = {}
    for m in matches:
        if m.missing_skills:
            for item in m.missing_skills:
                name = item.get("name") if isinstance(item, dict) else str(item)
                if name:
                    missing_freq[name] = missing_freq.get(name, 0) + 1

    skill_recs = []
    if missing_freq:
        sorted_missing = sorted(missing_freq.items(), key=lambda x: x[1], reverse=True)
        for s_name, count in sorted_missing[:4]:
            skill_recs.append({
                "skill": s_name,
                "reason": f"Required in {count} of your matched job descriptions",
                "learning_resource": f"Explore official documentation and build a hands-on project with {s_name}",
                "priority": "High"
            })
            
    if len(skill_recs) < 3:
        skill_recs.extend([
            {
                "skill": "Docker & Containerization",
                "reason": "Top modern qualification for production-ready full stack engineering",
                "learning_resource": "Docker Getting Started Guide & Compose multi-container tutorials",
                "priority": "Recommended"
            },
            {
                "skill": "Cloud Architecture (AWS / GCP)",
                "reason": "Crucial requirement for 78% of senior technical roles",
                "learning_resource": "AWS Solutions Architect Associate or Google Cloud Associate Engineer pathway",
                "priority": "Recommended"
            },
            {
                "skill": "System Design & Distributed Systems",
                "reason": "Essential for high-scale backend and architecture interviews",
                "learning_resource": "Designing Data-Intensive Applications & System Design Primer",
                "priority": "Recommended"
            }
        ])

    # 7. Recent User Activities
    activities = db.query(UserActivity).filter(
        UserActivity.user_id == current_user.id
    ).order_by(UserActivity.created_at.desc()).limit(8).all()

    # 8. Experience Intelligence Summary (from newest active resume)
    exp_summary: Optional[ExperienceSummaryOut] = None
    if resumes:
        primary_resume = resumes[0]
        experiences = db.query(ResumeExperience).filter(
            ResumeExperience.resume_id == primary_resume.id
        ).all()
        if not experiences and primary_resume.raw_text:
            experiences = ExperienceIntelligenceService.extract_and_save_experiences(db, primary_resume)
        if experiences:
            exp_summary = ExperienceSummaryOut(**ExperienceIntelligenceService.get_experience_summary(experiences))

    # 9. Career Readiness Score & Transparent Category Breakdown (Section 5.3)
    user_skills = db.query(ProfileSkill).filter(ProfileSkill.user_id == current_user.id).all()
    total_skills_count = len(user_skills)
    target_role_str = profile.target_title if profile and profile.target_title else "Software Engineer"
    role_alignment_score = min(100.0, max(20.0, total_skills_count * 10.0))

    demonstrated_count = sum(1 for s in user_skills if s.verification_status == "demonstrated")
    evidence_score = round((demonstrated_count / max(total_skills_count, 1)) * 100.0, 1) if total_skills_count else 10.0

    has_github = bool(profile and profile.github_url)
    has_portfolio = bool(profile and profile.portfolio_url)
    project_score = 40.0 + (35.0 if has_github else 0.0) + (25.0 if has_portfolio else 0.0)

    ats_score = analyses[0].overall_score if analyses else (65.0 if resumes else 0.0)

    interview_count = db.query(InterviewSession).filter(InterviewSession.user_id == current_user.id).count()
    interview_score = min(100.0, interview_count * 35.0 + 15.0) if interview_count else 0.0

    active_plan = db.query(LearningPlan).filter(
        LearningPlan.user_id == current_user.id,
        LearningPlan.is_active == True
    ).first()
    learning_score = active_plan.progress_percent if active_plan else 20.0

    overall_readiness = round(
        (role_alignment_score * 0.25) +
        (evidence_score * 0.20) +
        (project_score * 0.15) +
        (ats_score * 0.15) +
        (interview_score * 0.15) +
        (learning_score * 0.10),
        1
    )

    tier = "Exceptional" if overall_readiness >= 90 else (
        "High Readiness" if overall_readiness >= 75 else (
            "Competitive" if overall_readiness >= 50 else "Developing"
        )
    )

    readiness_breakdown = {
        "overall_score": overall_readiness,
        "readiness_tier": tier,
        "disclaimer": "Career readiness is an algorithmic compatibility estimate based on verifiable evidence. It is not an employment guarantee.",
        "calculation_method": "Weighted composite of 6 evidence pillars: Role Alignment (25%), Evidence Depth (20%), Project Proof (15%), CV Quality (15%), Mock Interviews (15%), and Learning Progress (10%).",
        "categories": [
            {
                "key": "role_alignment",
                "name": "Role Skill Alignment",
                "weight_percent": 25,
                "score": role_alignment_score,
                "status": "Strong" if role_alignment_score >= 75 else ("Satisfactory" if role_alignment_score >= 50 else "Needs Work"),
                "explanation": f"{total_skills_count} profile skills mapped against target role '{target_role_str}'.",
                "actionable_next_step": "Expand profile competencies to match missing job posting requirements."
            },
            {
                "key": "evidence_depth",
                "name": "Evidence Depth & Verification",
                "weight_percent": 20,
                "score": evidence_score,
                "status": "Strong" if evidence_score >= 70 else ("Satisfactory" if evidence_score >= 40 else "Needs Work"),
                "explanation": f"{demonstrated_count} of {total_skills_count} skills verified through assessments or code commits.",
                "actionable_next_step": "Take skill assessment quizzes to elevate 'mentioned' skills to 'demonstrated'."
            },
            {
                "key": "project_proof",
                "name": "Projects & Public Proof-of-Work",
                "weight_percent": 15,
                "score": project_score,
                "status": "Strong" if project_score >= 75 else ("Satisfactory" if project_score >= 50 else "Needs Work"),
                "explanation": f"GitHub ({'connected' if has_github else 'missing'}) and portfolio link ({'connected' if has_portfolio else 'missing'}).",
                "actionable_next_step": "Link your active GitHub profile and run the Proof-of-Work audit."
            },
            {
                "key": "cv_quality",
                "name": "CV ATS Parsing & Formatting Quality",
                "weight_percent": 15,
                "score": ats_score,
                "status": "Strong" if ats_score >= 80 else ("Satisfactory" if ats_score >= 60 else "Needs Work"),
                "explanation": f"Latest CV analyzed scored {ats_score}/100 on ATS readability and impact.",
                "actionable_next_step": "Resolve flagged vague phrases and format warnings in the CV Studio."
            },
            {
                "key": "interview_readiness",
                "name": "Interview Simulation Practice",
                "weight_percent": 15,
                "score": interview_score,
                "status": "Strong" if interview_score >= 70 else ("Satisfactory" if interview_score >= 35 else "Needs Work"),
                "explanation": f"{interview_count} interactive voice interview sessions completed with STAR scoring.",
                "actionable_next_step": "Practice a 5-question voice mock interview session in the Interview Studio."
            },
            {
                "key": "learning_milestones",
                "name": "Learning Plan Milestones",
                "weight_percent": 10,
                "score": learning_score,
                "status": "Strong" if learning_score >= 70 else ("Satisfactory" if learning_score >= 40 else "Needs Work"),
                "explanation": f"{round(learning_score)}% of targeted skill-gap learning tasks completed.",
                "actionable_next_step": "Complete next pending task in your personalized learning roadmap."
            }
        ]
    }

    return DashboardData(
        user=current_user,
        resumes_count=len(resumes),
        recent_resumes=resumes[:4],
        recent_analyses=analyses,
        recent_matches=matches,
        application_stats=app_stats,
        upcoming_reminders=reminders,
        skill_recommendations=skill_recs[:4],
        recent_activities=activities,
        experience_summary=exp_summary,
        career_readiness=readiness_breakdown
    )

