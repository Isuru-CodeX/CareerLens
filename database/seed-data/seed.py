import os
import sys
from datetime import datetime, timezone, timedelta

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend")))

from app.core.database import SessionLocal, Base, engine, init_db
from app.core.security import get_password_hash
from app.models.models import (
    User, CareerProfile, Resume, ResumeVersion, ParsedResumeSection,
    ResumeSkill, JobDescription, JobMatch, AnalysisRun, Recommendation,
    Application, ApplicationEvent, Reminder,
    ProfileExperience, ProfileSkill, Preset, PresetResume
)
from app.services.analysis_service import AnalysisService
from app.services.matching_service import MatchingService
from app.services.years_service import canonical_skill

def seed_profile_credentials(db, user_id: str, is_demo: bool = True):
    # Experiences
    existing_exps = db.query(ProfileExperience).filter(ProfileExperience.user_id == user_id).all()
    if not existing_exps:
        if is_demo:
            db.add_all([
                ProfileExperience(
                    user_id=user_id,
                    job_title="Senior Software Engineer",
                    company="Apex Cloud Systems",
                    industry="Cloud Infrastructure, SaaS, AI Tools",
                    start_year=2021,
                    start_month=3,
                    is_current=True,
                    description="Architected event-driven microservices processing 45M daily requests with 99.99% uptime.",
                    highlights=[
                        "Spearheaded database query optimization across PostgreSQL, reducing p99 latency from 450ms to 65ms.",
                        "Mentored a pod of 6 engineers and instituted automated end-to-end testing."
                    ],
                    source="manual"
                ),
                ProfileExperience(
                    user_id=user_id,
                    job_title="Full-Stack Developer",
                    company="Nova Interactive",
                    industry="Software, Internet & SaaS",
                    start_year=2018,
                    start_month=6,
                    end_year=2021,
                    end_month=2,
                    is_current=False,
                    description="Built interactive client-facing dashboards using React, TypeScript, and Tailwind CSS adopted by 25,000+ daily active users.",
                    highlights=[
                        "Designed RESTful API endpoints and implemented PostgreSQL database indexing strategies.",
                        "Automated CI/CD pipeline deployments via GitHub Actions."
                    ],
                    source="manual"
                )
            ])
        else:
            db.add(ProfileExperience(
                user_id=user_id,
                job_title="Software Engineering Developer",
                company="Independent & Academic Projects",
                industry="Software, Internet & SaaS",
                start_year=2023,
                start_month=1,
                is_current=True,
                description="Hands-on experience in software development, web technologies, database management, and building real-world projects.",
                highlights=[
                    "Engineered applications with Java, PHP, JavaScript, HTML, CSS, and MySQL backends.",
                    "Maintained open-source code repositories on GitHub and built portfolio solutions."
                ],
                source="manual"
            ))
        db.flush()

    # Skills
    existing_skills = db.query(ProfileSkill).filter(ProfileSkill.user_id == user_id).all()
    if not existing_skills:
        skill_names = (
            ["Python", "TypeScript", "React", "FastAPI", "Docker", "PostgreSQL", "AWS", "Redis", "CI/CD", "Kubernetes", "GraphQL"]
            if is_demo else
            ["Java", "PHP", "JavaScript", "HTML", "CSS", "MySQL", "Python", "React", "Git"]
        )
        for s in skill_names:
            canon = canonical_skill(s)
            db.add(ProfileSkill(
                user_id=user_id,
                name=canon,
                name_normalized=canon.lower(),
                source="manual"
            ))
        db.flush()

    # Presets
    existing_presets = db.query(Preset).filter(Preset.user_id == user_id).all()
    if not existing_presets:
        preset_name = "Full-Stack Cloud & AI" if is_demo else "Software Engineering & Web"
        target_role = "Senior Full-Stack Engineer" if is_demo else "Full Stack Software Engineer"
        p_obj = Preset(
            user_id=user_id,
            name=preset_name,
            target_role=target_role,
            include_manual=True
        )
        db.add(p_obj)
        db.flush()
        resume = db.query(Resume).filter(Resume.user_id == user_id).first()
        if resume:
            db.add(PresetResume(preset_id=p_obj.id, resume_id=resume.id))
        db.flush()

def run_seed():
    init_db()
    db = SessionLocal()
    
    try:
        # Check if demo user exists
        demo_email = "demo@careerlens.ai"
        existing = db.query(User).filter(User.email == demo_email).first()
        if existing:
            print("Demo user already exists. Ensuring profile credentials and presets are populated...")
            seed_profile_credentials(db, existing.id, is_demo=True)
            db.commit()
            print("Profile credentials and presets verified!")
            return

        print("Seeding demo user and career data...")
        user = User(
            email=demo_email,
            hashed_password=get_password_hash("CareerLens2026!"),
            full_name="Alex Rivera",
            appearance_preference="system"
        )
        db.add(user)
        db.flush()

        # Career Profile
        profile = CareerProfile(
            user_id=user.id,
            target_title="Senior Full-Stack Engineer",
            target_industry="Cloud Infrastructure & AI Tools",
            years_of_experience=6,
            preferred_locations=["San Francisco, CA", "Remote", "New York, NY"],
            desired_salary_min=160000,
            desired_salary_max=210000,
            summary="Senior Full-Stack Engineer with 6+ years specializing in distributed systems, modern React / TypeScript interfaces, and FastAPI cloud microservices.",
            phone="+1 (415) 890-2341",
            linkedin_url="https://linkedin.com/in/alexrivera",
            github_url="https://github.com/alexrivera",
            portfolio_url="https://alexrivera.dev",
            other_links=[{"label": "Personal Tech Blog", "url": "https://alexrivera.dev/blog"}],
            skills_list=["Python", "TypeScript", "React", "FastAPI", "Docker", "PostgreSQL", "AWS", "Redis", "CI/CD"],
            education_history=[{
                "degree": "B.S. in Computer Science",
                "institution": "University of California, Berkeley",
                "year": "2018"
            }],
            work_history=[
                {
                    "title": "Senior Software Engineer",
                    "company": "Apex Cloud Systems",
                    "dates": "2021 - Present",
                    "bullets": [
                        "Architected event-driven microservices processing 45M daily requests with 99.99% uptime.",
                        "Spearheaded database query optimization across PostgreSQL, reducing p99 latency from 450ms to 65ms."
                    ]
                }
            ]
        )
        db.add(profile)

        # Sample Resume
        sample_resume_text = """
Alex Rivera
alex.rivera@example.com | (415) 890-2341 | linkedin.com/in/alexrivera | github.com/alexrivera
San Francisco, CA

Professional Summary
High-impact Senior Full-Stack Engineer with 6+ years of production experience architecting scalable distributed services in Python and crafting responsive interfaces with TypeScript and React. Proven track record of improving latency by 45% and leading cross-functional teams to deliver enterprise-grade systems.

Experience
Senior Full-Stack Engineer - Apex Cloud Systems (2021 - Present)
- Spearheaded migration of monolithic core to FastAPI microservices containerized with Docker, decreasing p99 latency by 45%.
- Architected real-time analytics streaming engine handling 45M events daily with Redis and Apache Kafka.
- Mentored a pod of 6 engineers, instituted comprehensive automated end-to-end testing, increasing test coverage from 62% to 94%.
- Responsible for overseeing cloud infrastructure on AWS, optimizing instance sizing to save $14,000 monthly.

Full-Stack Developer - Nova Interactive (2018 - 2021)
- Built interactive client-facing dashboards using React, TypeScript, and Tailwind CSS adopted by 25,000+ daily active users.
- Designed RESTful API endpoints and implemented PostgreSQL database indexing strategies, reducing query bottlenecks by 38%.
- Helped with customer onboarding flows and automated CI/CD pipeline deployments via GitHub Actions.

Education
Bachelor of Science in Computer Science - University of California, Berkeley (2014 - 2018)

Skills
Python, TypeScript, JavaScript, React, FastAPI, Node.js, Docker, Kubernetes, PostgreSQL, Redis, AWS, Git, CI/CD, GraphQL, Tailwind CSS, Microservices, Agile
"""
        resume = Resume(
            user_id=user.id,
            title="Alex Rivera - Senior Full Stack Engineer",
            target_role="Senior Full-Stack Engineer",
            file_name="Alex_Rivera_Resume.pdf",
            file_path="mock_resume.pdf",
            file_size=145200,
            file_type="pdf",
            raw_text=sample_resume_text.strip()
        )
        db.add(resume)
        db.flush()

        # Parsed sections
        parsed_data = {
            "contact": {
                "name": "Alex Rivera",
                "email": "alex.rivera@example.com",
                "phone": "(415) 890-2341",
                "linkedin": "https://linkedin.com/in/alexrivera",
                "github": "https://github.com/alexrivera",
                "location": "San Francisco, CA"
            },
            "summary": "High-impact Senior Full-Stack Engineer with 6+ years of production experience...",
            "experience": [
                {
                    "title": "Senior Full-Stack Engineer",
                    "company": "Apex Cloud Systems",
                    "date": "2021 - Present",
                    "bullets": [
                        "Spearheaded migration of monolithic core to FastAPI microservices containerized with Docker, decreasing p99 latency by 45%.",
                        "Architected real-time analytics streaming engine handling 45M events daily with Redis and Apache Kafka.",
                        "Mentored a pod of 6 engineers, instituted comprehensive automated end-to-end testing, increasing test coverage from 62% to 94%."
                    ]
                },
                {
                    "title": "Full-Stack Developer",
                    "company": "Nova Interactive",
                    "date": "2018 - 2021",
                    "bullets": [
                        "Built interactive client-facing dashboards using React, TypeScript, and Tailwind CSS adopted by 25,000+ daily active users.",
                        "Designed RESTful API endpoints and implemented PostgreSQL database indexing strategies, reducing query bottlenecks by 38%."
                    ]
                }
            ],
            "education": [
                {
                    "degree": "Bachelor of Science in Computer Science",
                    "institution": "University of California, Berkeley",
                    "year": "2018"
                }
            ],
            "skills": [
                {"name": "Python", "category": "technical", "proficiency": "Proficient", "evidence": "Production FastAPI microservices"},
                {"name": "TypeScript", "category": "technical", "proficiency": "Proficient", "evidence": "React frontend interfaces"},
                {"name": "React", "category": "technical", "proficiency": "Proficient", "evidence": "25,000+ daily active users"},
                {"name": "FastAPI", "category": "technical", "proficiency": "Proficient", "evidence": "Core backend services"},
                {"name": "Docker", "category": "technical", "proficiency": "Proficient", "evidence": "Containerized microservices"},
                {"name": "PostgreSQL", "category": "technical", "proficiency": "Proficient", "evidence": "Query optimization and indexing"},
                {"name": "AWS", "category": "technical", "proficiency": "Proficient", "evidence": "Cloud infrastructure optimization"},
                {"name": "Redis", "category": "technical", "proficiency": "Proficient", "evidence": "Streaming engine caching"}
            ],
            "projects": ["CareerLens AI - Automated Career Platform", "Cloud Stream - Low-latency telemetry pipeline"],
            "certifications": ["AWS Certified Solutions Architect"]
        }

        # Add Parsed Sections
        section_configs = [
            ("contact", parsed_data["contact"]),
            ("summary", {"text": parsed_data["summary"]}),
            ("experience", {"items": parsed_data["experience"]}),
            ("education", {"items": parsed_data["education"]}),
            ("skills", {"items": parsed_data["skills"]}),
            ("projects", {"items": parsed_data["projects"]}),
            ("certifications", {"items": parsed_data["certifications"]})
        ]
        for sec_type, data in section_configs:
            sec = ParsedResumeSection(
                resume_id=resume.id,
                section_type=sec_type,
                raw_content=str(data),
                structured_data=data,
                is_user_verified=True
            )
            db.add(sec)

        # Version
        v = ResumeVersion(
            resume_id=resume.id,
            version_number=1,
            label="Original Upload - Senior Role",
            raw_text=sample_resume_text,
            structured_snapshot=parsed_data
        )
        db.add(v)

        # Analysis Run
        analysis_result = AnalysisService.analyze_resume(parsed_data, sample_resume_text)
        analysis = AnalysisRun(
            user_id=user.id,
            resume_id=resume.id,
            overall_score=analysis_result["overall_score"],
            structure_score=analysis_result["structure_score"],
            readability_score=analysis_result["readability_score"],
            impact_score=analysis_result["impact_score"],
            skills_score=analysis_result["skills_score"],
            findings=analysis_result["findings"],
            vague_phrases=analysis_result["vague_phrases"],
            strengths=analysis_result["strengths"],
            weaknesses=analysis_result["weaknesses"],
            recommendations=analysis_result["recommendations"],
            section_breakdown=analysis_result["section_breakdown"]
        )
        db.add(analysis)

        # Job Description
        jd_text = """
TechFlow is seeking a Senior Full-Stack Engineer to scale our real-time collaboration suite.
Requirements:
- 5+ years of software engineering experience.
- Deep expertise in Python (FastAPI/Django) and modern TypeScript / React.
- Solid understanding of PostgreSQL and Redis.
- Hands-on experience with Docker, CI/CD, and AWS infrastructure.
- Passion for clean code, automated testing, and mentorship.
Preferred:
- Kubernetes and Kafka experience.
- Experience with GraphQL APIs.
"""
        jd = JobDescription(
            user_id=user.id,
            title="Senior Full-Stack Engineer",
            company="TechFlow Labs",
            source_url="https://techflow.example.com/careers/senior-fullstack",
            raw_text=jd_text,
            required_skills=["Python", "FastAPI", "TypeScript", "React", "PostgreSQL", "Redis", "Docker", "AWS", "CI/CD"],
            preferred_skills=["Kubernetes", "Kafka", "GraphQL"],
            experience_level="Senior (5+ yrs)",
            salary_range="$175,000 - $215,000"
        )
        db.add(jd)
        db.flush()

        # Job Match
        match_res = MatchingService.match_resume_to_job(sample_resume_text, parsed_data["skills"], jd_text)
        job_match = JobMatch(
            user_id=user.id,
            resume_id=resume.id,
            job_description_id=jd.id,
            overall_score=match_res["overall_score"],
            structure_score=match_res["structure_score"],
            readability_score=match_res["readability_score"],
            skills_coverage_score=match_res["skills_coverage_score"],
            relevance_score=match_res["relevance_score"],
            matched_skills=match_res["matched_skills"],
            missing_skills=match_res["missing_skills"],
            partial_skills=match_res["partial_skills"],
            match_explanations=match_res["match_explanations"],
            recommendations=match_res["recommendations"]
        )
        db.add(job_match)

        # Application Pipeline Entries
        now = datetime.now(timezone.utc)
        applications_data = [
            {
                "company": "Stripe",
                "role": "Senior Full-Stack Engineer",
                "stage": "offer",
                "location": "San Francisco, CA (Hybrid)",
                "source": "Referral",
                "salary_range": "$185,000 - $220,000",
                "application_date": now - timedelta(days=28),
                "notes": "Received written offer package! Equity and base review underway.",
                "contact_name": "Sarah Chen",
                "contact_email": "schen@stripe.com"
            },
            {
                "company": "Figma",
                "role": "Senior Systems Engineer",
                "stage": "interview",
                "location": "San Francisco, CA",
                "source": "LinkedIn",
                "salary_range": "$175,000 - $210,000",
                "application_date": now - timedelta(days=14),
                "interview_date": now + timedelta(days=3),
                "notes": "System design round scheduled for Thursday at 2 PM PST.",
                "contact_name": "Marcus Vance"
            },
            {
                "company": "Airbnb",
                "role": "Lead Platform Engineer",
                "stage": "interview",
                "location": "Remote (US)",
                "source": "Company Career Page",
                "salary_range": "$190,000 - $235,000",
                "application_date": now - timedelta(days=21),
                "interview_date": now + timedelta(days=5),
                "notes": "Completed hiring manager chat. Technical panel next."
            },
            {
                "company": "Datadog",
                "role": "Senior Backend Engineer - Telemetry",
                "stage": "assessment",
                "location": "New York, NY (Remote)",
                "source": "Referral",
                "salary_range": "$170,000 - $205,000",
                "application_date": now - timedelta(days=7),
                "notes": "Take-home distributed system assessment submitted."
            },
            {
                "company": "Linear",
                "role": "Product Engineer",
                "stage": "applied",
                "location": "Remote",
                "source": "Twitter / X",
                "salary_range": "$165,000 - $195,000",
                "application_date": now - timedelta(days=3),
                "notes": "Submitted application with tailored cover letter and portfolio link."
            },
            {
                "company": "Vercel",
                "role": "Frontend Infrastructure Engineer",
                "stage": "applied",
                "location": "Remote",
                "source": "LinkedIn",
                "salary_range": "$170,000 - $200,000",
                "application_date": now - timedelta(days=5),
                "notes": "Awaiting recruiter response."
            },
            {
                "company": "Anthropic",
                "role": "Full-Stack AI Application Engineer",
                "stage": "interested",
                "location": "San Francisco, CA",
                "source": "Bookmark",
                "salary_range": "$180,000 - $230,000",
                "application_date": None,
                "notes": "Need to tailor resume to highlight LLM integration and reactive UI."
            }
        ]

        for app_info in applications_data:
            app_obj = Application(
                user_id=user.id,
                company=app_info["company"],
                role=app_info["role"],
                stage=app_info["stage"],
                location=app_info["location"],
                source=app_info["source"],
                salary_range=app_info["salary_range"],
                application_date=app_info["application_date"] or now,
                notes=app_info["notes"],
                contact_name=app_info.get("contact_name"),
                contact_email=app_info.get("contact_email"),
                interview_date=app_info.get("interview_date")
            )
            db.add(app_obj)
            db.flush()

            # Reminder if interview
            if app_info.get("interview_date"):
                rem = Reminder(
                    user_id=user.id,
                    application_id=app_obj.id,
                    title=f"Prepare for {app_obj.company} technical interview",
                    due_date=app_info["interview_date"] - timedelta(days=1),
                    is_completed=False
                )
                db.add(rem)

        seed_profile_credentials(db, user.id, is_demo=True)
        db.commit()
        print("Database successfully seeded with demo user and comprehensive career data!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()

