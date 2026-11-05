from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import (
    User, Resume, AnalysisRun, JobMatch, Application, Reminder, CareerProfile
)
from app.schemas.schemas import DashboardData, ApplicationStats

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

    return DashboardData(
        user=current_user,
        resumes_count=len(resumes),
        recent_resumes=resumes[:4],
        recent_analyses=analyses,
        recent_matches=matches,
        application_stats=app_stats,
        upcoming_reminders=reminders,
        skill_recommendations=skill_recs[:4]
    )
