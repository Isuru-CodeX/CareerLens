"""
backend/app/api/learning.py - Adaptive Learning and Skill-Gap Plan API.
Implements Section 4.5 of the CareerLens Implementation Specification.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import (
    User, ProfileSkill, UserSkillEvidence, CareerGoal,
    LearningPlan, LearningTask
)
from app.services.career_graph_service import CareerGraphService
from app.services.activity_service import record_user_activity
from app.services.years_service import canonical_skill

router = APIRouter(prefix="/learning", tags=["Adaptive Learning & Skill-Gap Plan"])

# Curated skill knowledge base for practical objectives and quizzes
SKILL_LEARNING_METADATA: Dict[str, Dict[str, Any]] = {
    "kubernetes": {
        "title": "Production Container Orchestration with Kubernetes",
        "objective": "Understand cluster architecture, Pods, Deployments, Services, and Helm package management for high-availability systems.",
        "effort_hours": 8.0,
        "prerequisites": ["Docker", "Linux CLI", "Networking Basics"],
        "resources": [
            {"title": "Kubernetes Official Tutorials", "url": "https://kubernetes.io/docs/tutorials/", "type": "Documentation"},
            {"title": "Kubernetes the Hard Way", "url": "https://github.com/kelseyhightower/kubernetes-the-hard-way", "type": "Hands-on Lab"}
        ],
        "mini_project": "Deploy a multi-tier web application with rolling updates, Ingress routing, and Horizontal Pod Autoscaler.",
        "quiz": [
            {
                "id": "q1",
                "question": "Which Kubernetes resource manages a set of identical Pods and ensures that the specified number are running?",
                "options": ["ReplicaSet / Deployment", "Namespace", "Ingress", "ConfigMap"],
                "answer_idx": 0
            },
            {
                "id": "q2",
                "question": "What is the primary difference between a ClusterIP and a NodePort service?",
                "options": [
                    "ClusterIP exposes the service internally within the cluster, while NodePort exposes it on a static port on each node's IP",
                    "ClusterIP is for stateful workloads and NodePort is for stateless",
                    "ClusterIP provides external public DNS routing while NodePort does not",
                    "ClusterIP requires an external cloud load balancer while NodePort does not"
                ],
                "answer_idx": 0
            },
            {
                "id": "q3",
                "question": "How does Kubernetes handle zero-downtime rolling updates in a Deployment?",
                "options": [
                    "By creating new Pods while keeping old Pods active until new Pods pass readiness probes",
                    "By rebooting all worker nodes simultaneously",
                    "By caching HTTP responses at the ingress gateway",
                    "By pausing incoming traffic for 30 seconds"
                ],
                "answer_idx": 0
            }
        ]
    },
    "docker": {
        "title": "Containerization and Image Optimization with Docker",
        "objective": "Learn multi-stage Dockerfile builds, volume persistence, bridge networking, and local multi-service composition.",
        "effort_hours": 5.0,
        "prerequisites": ["Linux CLI"],
        "resources": [
            {"title": "Docker Getting Started Guide", "url": "https://docs.docker.com/get-started/", "type": "Tutorial"}
        ],
        "mini_project": "Build a production multi-stage Dockerfile that reduces image footprint by over 60% and runs as an unprivileged user.",
        "quiz": [
            {
                "id": "q1",
                "question": "Why are multi-stage builds recommended in production Dockerfiles?",
                "options": [
                    "To separate build dependencies from the final minimal runtime image",
                    "To allow running multiple Docker daemons in parallel",
                    "To speed up container startup by skipping network initialization",
                    "To automatically generate unit tests during build"
                ],
                "answer_idx": 0
            },
            {
                "id": "q2",
                "question": "Which Docker instruction should be used to avoid running containers as root?",
                "options": ["USER", "RUN chown", "ENTRYPOINT", "EXPOSE"],
                "answer_idx": 0
            }
        ]
    },
    "system design": {
        "title": "Scalable Distributed System Architecture",
        "objective": "Master trade-offs in distributed computing: CAP theorem, caching strategies, partitioning, and asynchronous message brokering.",
        "effort_hours": 10.0,
        "prerequisites": ["Data Structures", "HTTP Protocols", "Relational Databases"],
        "resources": [
            {"title": "System Design Primer", "url": "https://github.com/donnemartin/system-design-primer", "type": "Guide"}
        ],
        "mini_project": "Design an end-to-end distributed URL shortener or rate limiter handling 100,000 requests/sec with low latency.",
        "quiz": [
            {
                "id": "q1",
                "question": "According to the CAP Theorem, what can a distributed data store guarantee during a network partition?",
                "options": [
                    "Either Consistency or Availability, but not both simultaneously",
                    "Both Consistency and Availability at all times",
                    "Neither Consistency nor Partition Tolerance",
                    "Guaranteed sub-millisecond response latency"
                ],
                "answer_idx": 0
            },
            {
                "id": "q2",
                "question": "Which caching pattern writes directly to both the cache and underlying database simultaneously?",
                "options": ["Write-Through", "Cache-Aside", "Write-Back", "Refresh-Ahead"],
                "answer_idx": 0
            }
        ]
    }
}

def get_skill_metadata(skill_name: str) -> Dict[str, Any]:
    key = skill_name.lower().strip()
    for meta_key, val in SKILL_LEARNING_METADATA.items():
        if meta_key in key or key in meta_key:
            return val
    # Generic high-quality template
    canon = canonical_skill(skill_name) or skill_name.title()
    return {
        "title": f"Mastery & Practical Engineering in {canon}",
        "objective": f"Develop deep practical proficiency in {canon}, covering modern design patterns, automated testing, and production deployment.",
        "effort_hours": 6.0,
        "prerequisites": ["Core Computer Science Principles"],
        "resources": [
            {"title": f"Official {canon} Documentation & Guides", "url": f"https://www.google.com/search?q={canon}+documentation", "type": "Documentation"},
            {"title": f"Production Best Practices for {canon}", "url": f"https://www.google.com/search?q={canon}+production+best+practices", "type": "Article"}
        ],
        "mini_project": f"Build and deploy a functional, tested micro-feature or portfolio component demonstrating {canon} with clean architecture.",
        "quiz": [
            {
                "id": "q1",
                "question": f"What is a critical performance and reliability best practice when working with {canon} in production?",
                "options": [
                    "Profiling bottlenecks, enforcing error handling, and configuring automated observability",
                    "Disabling all logging to maximize raw CPU throughput",
                    "Bypassing input validation in performance-critical code paths",
                    "Relying solely on in-memory storage without backups"
                ],
                "answer_idx": 0
            },
            {
                "id": "q2",
                "question": f"When integrating {canon} into a CI/CD pipeline, what should be validated first?",
                "options": [
                    "Automated unit tests and static code quality linting",
                    "Immediate production deployment without staging",
                    "Sending emails to all developers on every commit",
                    "Deleting all historical artifacts to save disk space"
                ],
                "answer_idx": 0
            }
        ]
    }


# Schemas
class GeneratePlanRequest(BaseModel):
    target_role: str
    target_role_id: Optional[str] = None
    weekly_hours: int = Field(default=5, ge=1, le=40)
    preferred_days: List[str] = Field(default_factory=lambda: ["Monday", "Wednesday", "Saturday"])
    focus_skills: Optional[List[str]] = None


class UpdateTaskStatusRequest(BaseModel):
    status: str = Field(..., pattern="^(planned|in_progress|completed|assessed)$")


class SubmitQuizRequest(BaseModel):
    answers: Dict[str, int]  # question_id -> chosen option index


class UpdateScheduleRequest(BaseModel):
    weekly_hours: int = Field(..., ge=1, le=40)
    preferred_days: List[str] = Field(default_factory=list)


@router.post("/generate")
def generate_learning_plan(
    req: GeneratePlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates a prioritized, structured learning plan tailored to the gap between
    the user's verified skills and target role requirements.
    """
    # Deactivate existing active plans
    db.query(LearningPlan).filter(
        LearningPlan.user_id == current_user.id,
        LearningPlan.is_active == True
    ).update({"is_active": False})

    # Fetch user verified profile skills
    user_skills = [
        s.name.lower() for s in db.query(ProfileSkill).filter(ProfileSkill.user_id == current_user.id).all()
    ]

    # Find required skills from knowledge graph
    graph = CareerGraphService.get_full_graph()
    target_node = None
    if req.target_role_id:
        target_node = next((n for n in graph["nodes"] if n["id"] == req.target_role_id), None)
    if not target_node:
        target_node = next((n for n in graph["nodes"] if n["title"].lower() == req.target_role.lower()), None)

    req_skills = target_node.get("required_skills", []) if target_node else []
    if req.focus_skills:
        req_skills.extend(req.focus_skills)

    if not req_skills:
        req_skills = ["Python", "Docker", "Kubernetes", "System Design", "Cloud Architecture"]

    # Filter for missing skills
    missing_skills = [s for s in req_skills if s.lower() not in user_skills]
    if not missing_skills:
        # If all base skills present, recommend advanced topics
        missing_skills = [f"Advanced {req_skills[0]} Architecture", "Distributed Systems & Resiliency", "High-Performance Observability"]

    # Deduplicate
    seen = set()
    deduped_missing = []
    for s in missing_skills:
        k = s.lower().strip()
        if k not in seen:
            seen.add(k)
            deduped_missing.append(s)

    # Link to active CareerGoal if present
    active_goal = db.query(CareerGoal).filter(
        CareerGoal.user_id == current_user.id,
        CareerGoal.is_active == True
    ).first()

    plan = LearningPlan(
        user_id=current_user.id,
        goal_id=active_goal.id if active_goal else None,
        target_role=req.target_role,
        weekly_hours=req.weekly_hours,
        preferred_days=req.preferred_days,
        progress_percent=0.0,
        is_active=True
    )
    db.add(plan)
    db.flush()

    for skill_name in deduped_missing[:6]:
        meta = get_skill_metadata(skill_name)
        canon = canonical_skill(skill_name) or skill_name.title()
        task = LearningTask(
            plan_id=plan.id,
            skill_name=canon,
            skill_normalized=canon.lower(),
            title=meta["title"],
            learning_objective=meta["objective"],
            estimated_effort_hours=meta["effort_hours"],
            prerequisites=meta.get("prerequisites", []),
            resources=meta.get("resources", []),
            mini_project=meta.get("mini_project"),
            status="planned",
            assessment_quiz=meta.get("quiz")
        )
        db.add(task)

    db.commit()
    db.refresh(plan)

    record_user_activity(
        db, current_user.id, "learning_plan_created",
        f"Generated personalized learning plan for '{req.target_role}' ({len(deduped_missing[:6])} milestones)",
        entity_type="learning_plan", entity_id=plan.id
    )

    return get_active_plan(current_user, db)


@router.get("/plan")
def get_active_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the user's active learning plan with tasks, schedule, and progress.
    """
    plan = db.query(LearningPlan).filter(
        LearningPlan.user_id == current_user.id,
        LearningPlan.is_active == True
    ).order_by(LearningPlan.created_at.desc()).first()

    if not plan:
        return {"has_plan": False, "plan": None, "tasks": []}

    tasks = db.query(LearningTask).filter(
        LearningTask.plan_id == plan.id
    ).order_by(LearningTask.created_at.asc()).all()

    # Calculate actual progress
    completed_count = sum(1 for t in tasks if t.status in ("completed", "assessed"))
    pct = round((completed_count / max(len(tasks), 1)) * 100, 1) if tasks else 0.0
    if plan.progress_percent != pct:
        plan.progress_percent = pct
        db.commit()

    return {
        "has_plan": True,
        "plan": {
            "id": plan.id,
            "target_role": plan.target_role,
            "weekly_hours": plan.weekly_hours,
            "preferred_days": plan.preferred_days,
            "progress_percent": plan.progress_percent,
            "created_at": plan.created_at
        },
        "tasks": [
            {
                "id": t.id,
                "skill_name": t.skill_name,
                "title": t.title,
                "learning_objective": t.learning_objective,
                "estimated_effort_hours": t.estimated_effort_hours,
                "prerequisites": t.prerequisites,
                "resources": t.resources,
                "mini_project": t.mini_project,
                "status": t.status,
                "assessment_score": t.assessment_score,
                "has_quiz": bool(t.assessment_quiz),
                "completed_at": t.completed_at
            }
            for t in tasks
        ]
    }


@router.get("/tasks/{task_id}/quiz")
def get_task_quiz(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the quiz questions for a learning task (without revealing correct answer indices).
    """
    task = db.query(LearningTask).join(LearningPlan).filter(
        LearningTask.id == task_id,
        LearningPlan.user_id == current_user.id
    ).first()
    if not task or not task.assessment_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found for this task.")

    # Return questions sanitized of answer keys
    sanitized = []
    for q in task.assessment_quiz:
        sanitized.append({
            "id": q.get("id"),
            "question": q.get("question"),
            "options": q.get("options")
        })

    return {
        "task_id": task.id,
        "skill_name": task.skill_name,
        "title": task.title,
        "questions": sanitized
    }


@router.patch("/tasks/{task_id}/status")
def update_task_status(
    task_id: str,
    req: UpdateTaskStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates the execution state of a task (planned, in_progress, completed).
    Note: 'assessed' status requires passing the quiz assessment.
    """
    task = db.query(LearningTask).join(LearningPlan).filter(
        LearningTask.id == task_id,
        LearningPlan.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Learning task not found.")

    if req.status == "assessed" and task.assessment_score is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="To mark a task as assessed, submit and pass the verification assessment quiz."
        )

    task.status = req.status
    if req.status in ("completed", "assessed"):
        task.completed_at = datetime.now(timezone.utc)

    db.commit()

    record_user_activity(
        db, current_user.id, "learning_task_updated",
        f"Task '{task.title}' updated to {req.status}",
        entity_type="learning_task", entity_id=task.id
    )

    return {"status": "success", "task_id": task.id, "new_status": task.status}


@router.post("/tasks/{task_id}/quiz")
def submit_task_quiz(
    task_id: str,
    req: SubmitQuizRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits quiz answers for verification.
    If passed (score >= 67%): updates task to 'assessed' AND creates a new verified
    'demonstrated' UserSkillEvidence record in the user's unified profile!
    If failed: keeps task in progress and returns targeted revision advice.
    """
    task = db.query(LearningTask).join(LearningPlan).filter(
        LearningTask.id == task_id,
        LearningPlan.user_id == current_user.id
    ).first()
    if not task or not task.assessment_quiz:
        raise HTTPException(status_code=404, detail="Task or quiz not found.")

    quiz = task.assessment_quiz
    correct_count = 0
    feedback = []

    for q in quiz:
        qid = q.get("id")
        correct_idx = q.get("answer_idx", 0)
        chosen_idx = req.answers.get(qid)
        is_correct = chosen_idx == correct_idx
        if is_correct:
            correct_count += 1
        feedback.append({
            "question_id": qid,
            "question": q.get("question"),
            "is_correct": is_correct,
            "correct_option": q.get("options", [])[correct_idx] if q.get("options") else None
        })

    score_pct = round((correct_count / max(len(quiz), 1)) * 100, 1)
    passed = score_pct >= 66.0
    task.assessment_score = score_pct

    evidence_created = False
    if passed:
        task.status = "assessed"
        task.completed_at = datetime.now(timezone.utc)

        # Upgrade or insert ProfileSkill and UserSkillEvidence
        canon = canonical_skill(task.skill_name) or task.skill_name
        key = canon.lower()

        prof_skill = db.query(ProfileSkill).filter(
            ProfileSkill.user_id == current_user.id,
            ProfileSkill.name_normalized == key
        ).first()

        if not prof_skill:
            prof_skill = ProfileSkill(
                user_id=current_user.id,
                name=canon,
                name_normalized=key,
                source="assessment",
                proficiency_estimate="Intermediate",
                confidence=0.88,
                verification_status="demonstrated",
                user_confirmed=True
            )
            db.add(prof_skill)
            db.flush()
        else:
            prof_skill.verification_status = "demonstrated"
            prof_skill.confidence = max(prof_skill.confidence or 0.7, 0.88)
            prof_skill.user_confirmed = True

        # Create demonstrated evidence record
        evidence = UserSkillEvidence(
            user_id=current_user.id,
            skill_id=prof_skill.id,
            skill_name=canon,
            skill_normalized=key,
            source_type="coding_assessment",
            source_reference=f"Quiz Assessment: {task.title}",
            evidence_text=f"Scored {score_pct}% on technical verification assessment for {canon}.",
            confidence=0.88,
            proficiency_estimate="Intermediate",
            verification_status="demonstrated",
            user_confirmed=True
        )
        db.add(evidence)
        evidence_created = True

        record_user_activity(
            db, current_user.id, "skill_assessed_passed",
            f"Passed assessment for '{canon}' with {score_pct}%. Skill verified as Demonstrated.",
            entity_type="skill", entity_id=prof_skill.id
        )
    else:
        # Failed: does not increase proficiency
        task.status = "in_progress"
        record_user_activity(
            db, current_user.id, "skill_assessed_revision",
            f"Completed assessment for '{task.skill_name}' ({score_pct}%). Targeted revision recommended.",
            entity_type="learning_task", entity_id=task.id
        )

    db.commit()

    return {
        "passed": passed,
        "score_percent": score_pct,
        "correct_answers": correct_count,
        "total_questions": len(quiz),
        "feedback": feedback,
        "skill_verified": evidence_created,
        "message": (
            f"Congratulations! You passed with {score_pct}%. Verified evidence added to your skill profile."
            if passed else
            f"You scored {score_pct}%. Review the prerequisite materials and retry to prove mastery."
        )
    }


@router.patch("/schedule")
def update_learning_schedule(
    req: UpdateScheduleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates available study hours per week and preferred learning days.
    """
    plan = db.query(LearningPlan).filter(
        LearningPlan.user_id == current_user.id,
        LearningPlan.is_active == True
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="No active learning plan found.")

    plan.weekly_hours = req.weekly_hours
    plan.preferred_days = req.preferred_days
    db.commit()

    return {
        "status": "success",
        "weekly_hours": plan.weekly_hours,
        "preferred_days": plan.preferred_days
    }
