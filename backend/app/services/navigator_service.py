"""
Career Navigator Live Job Market & Auto-Refreshing Salary Service.
Manages:
- Canonical role taxonomy and initial seeding
- Multi-source job feed aggregation (Remotive, Arbeitnow, Adzuna)
- Work-mode classification and posting upserts
- Statistical salary snapshot creation (append-only for 30-day trends)
- Stalest-first background refresh scheduler integration
- Rate limiting / cooldown protection on manual refreshes
"""
from datetime import datetime, timezone, timedelta
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.models import Industry, JobRole, JobPosting, SalarySnapshot
from app.services.job_sources.base import RawJob
from app.services.job_sources.adzuna import fetch_adzuna
from app.services.job_sources.remotive import fetch_remotive
from app.services.job_sources.arbeitnow import fetch_arbeitnow
from app.services.salary_stats import annual_midpoint, summarize

logger = logging.getLogger(__name__)

# Cooldown tracking for manual /refresh calls (10 minutes)
_LAST_MANUAL_REFRESH: Optional[datetime] = None
MANUAL_REFRESH_COOLDOWN_SECONDS = 600

DEFAULT_TAXONOMY: Dict[str, Dict[str, List[str]]] = {
    "Technology": {
        "Software Engineer": ["software engineer", "backend developer", "python developer"],
        "Data Engineer": ["data engineer", "etl developer", "big data engineer"],
        "DevOps Engineer": ["devops engineer", "site reliability engineer", "platform engineer"],
        "Frontend Software Engineer": ["frontend engineer", "react developer", "ui engineer"],
        "Full Stack Engineer": ["full stack developer", "full stack engineer", "web application developer"],
        "Cloud Solutions Architect": ["cloud architect", "aws architect", "solutions architect"],
        "Machine Learning Engineer": ["machine learning engineer", "ml engineer", "ai engineer"],
        "QA Engineer": ["qa engineer", "software test engineer", "test automation"],
        "Cybersecurity Analyst": ["cybersecurity analyst", "information security", "soc analyst"],
    },
    "Healthcare": {
        "Registered Nurse": ["registered nurse", "staff nurse", "clinical nurse"],
        "Clinical Data Manager": ["clinical data manager", "clinical researcher", "biostatistician"],
        "Health Informatics Specialist": ["health informatics", "medical records specialist"],
        "Pharmacist": ["pharmacist", "clinical pharmacist"],
    },
    "Finance": {
        "Financial Analyst": ["financial analyst", "fp&a analyst", "corporate finance"],
        "Quantitative Analyst": ["quantitative analyst", "quant developer", "risk modeler"],
        "Risk Management Specialist": ["risk analyst", "credit risk analyst", "operational risk"],
        "Senior Accountant": ["senior accountant", "certified public accountant", "auditor"],
    },
    "Marketing": {
        "Digital Marketing Manager": ["digital marketing manager", "growth marketer", "performance marketing"],
        "Content Strategist": ["content strategist", "technical writer", "copywriter"],
        "Product Marketing Manager": ["product marketing manager", "pmm", "go to market specialist"],
    },
    "Education": {
        "Instructional Designer": ["instructional designer", "learning experience designer"],
        "EdTech Specialist": ["edtech specialist", "educational technologist"],
    },
    "Legal": {
        "Corporate Compliance Specialist": ["compliance officer", "regulatory compliance analyst"],
        "Contract Specialist": ["contract administrator", "legal operations specialist"],
    }
}

# Baseline seed salary benchmarks (used on empty DB until first background live scrape completes)
BASELINE_BENCHMARKS: Dict[str, Dict[str, float]] = {
    "Software Engineer": {"p25": 92000, "median": 128000, "p75": 162000},
    "Data Engineer": {"p25": 98000, "median": 134000, "p75": 168000},
    "DevOps Engineer": {"p25": 105000, "median": 142000, "p75": 178000},
    "Frontend Software Engineer": {"p25": 85000, "median": 115000, "p75": 148000},
    "Full Stack Engineer": {"p25": 95000, "median": 130000, "p75": 165000},
    "Cloud Solutions Architect": {"p25": 140000, "median": 185000, "p75": 235000},
    "Machine Learning Engineer": {"p25": 115000, "median": 158000, "p75": 205000},
    "QA Engineer": {"p25": 72000, "median": 96000, "p75": 122000},
    "Cybersecurity Analyst": {"p25": 88000, "median": 118000, "p75": 152000},
    "Registered Nurse": {"p25": 68000, "median": 86000, "p75": 108000},
    "Clinical Data Manager": {"p25": 82000, "median": 104000, "p75": 132000},
    "Health Informatics Specialist": {"p25": 74000, "median": 92000, "p75": 116000},
    "Pharmacist": {"p25": 112000, "median": 132000, "p75": 154000},
    "Financial Analyst": {"p25": 75000, "median": 96000, "p75": 124000},
    "Quantitative Analyst": {"p25": 125000, "median": 175000, "p75": 240000},
    "Risk Management Specialist": {"p25": 86000, "median": 112000, "p75": 144000},
    "Senior Accountant": {"p25": 78000, "median": 98000, "p75": 122000},
    "Digital Marketing Manager": {"p25": 72000, "median": 94000, "p75": 122000},
    "Content Strategist": {"p25": 65000, "median": 84000, "p75": 108000},
    "Product Marketing Manager": {"p25": 105000, "median": 138000, "p75": 172000},
    "Instructional Designer": {"p25": 62000, "median": 78000, "p75": 98000},
    "EdTech Specialist": {"p25": 66000, "median": 82000, "p75": 104000},
    "Corporate Compliance Specialist": {"p25": 78000, "median": 102000, "p75": 134000},
    "Contract Specialist": {"p25": 68000, "median": 88000, "p75": 114000},
}


class NavigatorService:

    @staticmethod
    def ensure_seed_data(db: Session) -> None:
        """
        Seeds canonical industries, roles, and baseline snapshots if not present.
        """
        existing_industries = {ind.name: ind for ind in db.query(Industry).all()}
        
        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)
        fifteen_days_ago = now - timedelta(days=15)

        for industry_name, roles in DEFAULT_TAXONOMY.items():
            industry = existing_industries.get(industry_name)
            if not industry:
                industry = Industry(name=industry_name)
                db.add(industry)
                db.flush()
                existing_industries[industry_name] = industry

            for title, terms in roles.items():
                role = db.query(JobRole).filter(
                    JobRole.industry_id == industry.id,
                    JobRole.title == title
                ).first()

                if not role:
                    role = JobRole(
                        industry_id=industry.id,
                        title=title,
                        search_terms=terms,
                        last_refreshed=now - timedelta(hours=8)
                    )
                    db.add(role)
                    db.flush()

                # Seed baseline snapshots if no snapshot exists yet
                has_snapshot = db.query(SalarySnapshot).filter(SalarySnapshot.role_id == role.id).first()
                if not has_snapshot and title in BASELINE_BENCHMARKS:
                    bm = BASELINE_BENCHMARKS[title]
                    # Seed 3 historical data points for instant trend lines
                    db.add(SalarySnapshot(
                        role_id=role.id,
                        country="us",
                        work_mode=None,
                        currency="USD",
                        p25=round(bm["p25"] * 0.96, 2),
                        median=round(bm["median"] * 0.96, 2),
                        p75=round(bm["p75"] * 0.96, 2),
                        sample_size=32,
                        estimated_share=0.25,
                        source="market_baseline",
                        fetched_at=thirty_days_ago
                    ))
                    db.add(SalarySnapshot(
                        role_id=role.id,
                        country="us",
                        work_mode=None,
                        currency="USD",
                        p25=round(bm["p25"] * 0.98, 2),
                        median=round(bm["median"] * 0.98, 2),
                        p75=round(bm["p75"] * 0.98, 2),
                        sample_size=40,
                        estimated_share=0.20,
                        source="market_baseline",
                        fetched_at=fifteen_days_ago
                    ))
                    db.add(SalarySnapshot(
                        role_id=role.id,
                        country="us",
                        work_mode=None,
                        currency="USD",
                        p25=bm["p25"],
                        median=bm["median"],
                        p75=bm["p75"],
                        sample_size=48,
                        estimated_share=0.18,
                        source="market_baseline",
                        fetched_at=now
                    ))

        db.commit()

    @staticmethod
    def roles_stalest_first(db: Session, limit: int = 20) -> List[JobRole]:
        """
        Retrieves canonical job roles ordered by stalest last_refreshed timestamp.
        """
        return db.query(JobRole).order_by(JobRole.last_refreshed.asc().nullsfirst()).limit(limit).all()

    @staticmethod
    def upsert_postings(db: Session, role: JobRole, country: str, jobs: List[RawJob]) -> int:
        """
        Upserts job postings by (source, external_id) unique constraint.
        """
        now = datetime.now(timezone.utc)
        count = 0
        for rj in jobs:
            if not rj.external_id:
                continue
            posting = db.query(JobPosting).filter(
                JobPosting.source == rj.source,
                JobPosting.external_id == rj.external_id
            ).first()

            if posting:
                posting.last_seen = now
                posting.title = rj.title
                posting.company = rj.company
                posting.location = rj.location
                posting.work_mode = rj.work_mode
                posting.salary_min = rj.salary_min
                posting.salary_max = rj.salary_max
                posting.currency = rj.currency or "USD"
                posting.salary_is_estimated = rj.estimated
                posting.url = rj.url
            else:
                posting = JobPosting(
                    source=rj.source,
                    external_id=rj.external_id,
                    role_id=role.id,
                    title=rj.title,
                    company=rj.company,
                    location=rj.location,
                    work_mode=rj.work_mode,
                    salary_min=rj.salary_min,
                    salary_max=rj.salary_max,
                    currency=rj.currency or "USD",
                    salary_is_estimated=rj.estimated,
                    url=rj.url,
                    posted_at=rj.posted_at or now,
                    last_seen=now,
                )
                db.add(posting)
                count += 1

        db.commit()
        return count

    @staticmethod
    def save_snapshot(
        db: Session,
        role_id: int,
        country: str,
        work_mode: Optional[str],
        stats: Dict[str, Any],
        estimated_share: float = 0.0,
        source: str = "aggregator"
    ) -> SalarySnapshot:
        """
        Appends a new salary snapshot for historical trend tracking.
        """
        snapshot = SalarySnapshot(
            role_id=role_id,
            country=country.lower(),
            work_mode=work_mode,
            currency="USD" if country.lower() == "us" else "EUR",
            p25=stats["p25"],
            median=stats["median"],
            p75=stats["p75"],
            sample_size=stats.get("n", 0),
            estimated_share=estimated_share,
            source=source,
            fetched_at=datetime.now(timezone.utc)
        )
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)
        return snapshot

    @staticmethod
    def mark_refreshed(db: Session, role: JobRole) -> None:
        """
        Updates role.last_refreshed to the current UTC timestamp.
        """
        role.last_refreshed = datetime.now(timezone.utc)
        db.commit()

    @staticmethod
    def latest_snapshot(
        db: Session,
        role_id: int,
        country: str = "us",
        work_mode: Optional[str] = None
    ) -> Optional[SalarySnapshot]:
        """
        Retrieves the newest snapshot for the role. Falls back to work_mode=None if specific mode not found.
        """
        c = country.lower().strip()
        if work_mode and work_mode.lower() != "all":
            snap = db.query(SalarySnapshot).filter(
                SalarySnapshot.role_id == role_id,
                SalarySnapshot.country == c,
                SalarySnapshot.work_mode == work_mode.lower()
            ).order_by(SalarySnapshot.fetched_at.desc()).first()
            if snap:
                return snap

        # Fallback to general (all modes) snapshot
        return db.query(SalarySnapshot).filter(
            SalarySnapshot.role_id == role_id,
            SalarySnapshot.country == c,
            SalarySnapshot.work_mode.is_(None)
        ).order_by(SalarySnapshot.fetched_at.desc()).first()

    @staticmethod
    def snapshots_since(
        db: Session,
        role_id: int,
        country: str = "us",
        work_mode: Optional[str] = None,
        days: int = 30
    ) -> List[SalarySnapshot]:
        """
        Retrieves historical snapshots within the specified number of days for charting.
        """
        c = country.lower().strip()
        since = datetime.now(timezone.utc) - timedelta(days=days)
        q = db.query(SalarySnapshot).filter(
            SalarySnapshot.role_id == role_id,
            SalarySnapshot.country == c,
            SalarySnapshot.fetched_at >= since
        )
        if work_mode and work_mode.lower() != "all":
            q = q.filter(SalarySnapshot.work_mode == work_mode.lower())
        else:
            q = q.filter(SalarySnapshot.work_mode.is_(None))

        return q.order_by(SalarySnapshot.fetched_at.asc()).all()

    @staticmethod
    def get_industries(db: Session) -> List[Dict[str, Any]]:
        """
        Returns list of industries with role counts and open posting counts.
        """
        industries = db.query(Industry).all()
        out = []
        for ind in industries:
            roles = db.query(JobRole).filter(JobRole.industry_id == ind.id).all()
            role_ids = [r.id for r in roles]
            postings_count = 0
            if role_ids:
                postings_count = db.query(func.count(JobPosting.id)).filter(
                    JobPosting.role_id.in_(role_ids)
                ).scalar() or 0

            out.append({
                "id": ind.id,
                "name": ind.name,
                "role_count": len(roles),
                "openings_count": postings_count
            })
        return out

    @staticmethod
    def get_roles_overview(
        db: Session,
        industry_id: Optional[int] = None,
        work_mode: Optional[str] = None,
        search: Optional[str] = None,
        country: str = "us"
    ) -> List[Dict[str, Any]]:
        """
        Retrieves roles with live vacancy counts, work-mode breakdown, and latest salary snapshot.
        """
        q = db.query(JobRole)
        if industry_id:
            q = q.filter(JobRole.industry_id == industry_id)
        if search:
            s = f"%{search.strip().lower()}%"
            q = q.filter(func.lower(JobRole.title).like(s))

        roles = q.all()
        results = []
        now = datetime.now(timezone.utc)

        for role in roles:
            # Query postings counts for this role
            pq = db.query(JobPosting).filter(JobPosting.role_id == role.id)
            all_postings = pq.all()
            total_openings = len(all_postings)

            # Work mode counts
            mode_counts = {"remote": 0, "hybrid": 0, "onsite": 0, "unknown": 0}
            for p in all_postings:
                m = p.work_mode or "unknown"
                mode_counts[m] = mode_counts.get(m, 0) + 1

            # If work_mode filter is set, check whether this role has openings in that mode
            if work_mode and work_mode.lower() not in ("all", "any"):
                req_mode = work_mode.lower()
                if mode_counts.get(req_mode, 0) == 0 and total_openings > 0:
                    continue

            # Fetch latest salary snapshot
            snap = NavigatorService.latest_snapshot(db, role.id, country=country, work_mode=work_mode)
            is_stale = False
            snap_data = None
            if snap:
                fetched_at = snap.fetched_at
                if fetched_at.tzinfo is None:
                    fetched_at = fetched_at.replace(tzinfo=timezone.utc)
                age_hours = (now - fetched_at).total_seconds() / 3600.0
                is_stale = age_hours > 12.0
                snap_data = {
                    "id": snap.id,
                    "p25": snap.p25,
                    "median": snap.median,
                    "p75": snap.p75,
                    "sample_size": snap.sample_size,
                    "estimated_share": snap.estimated_share,
                    "currency": snap.currency,
                    "work_mode": snap.work_mode,
                    "source": snap.source,
                    "fetched_at": snap.fetched_at.isoformat()
                }

            industry_name = role.industry.name if role.industry else "General"

            results.append({
                "id": role.id,
                "title": role.title,
                "industry_id": role.industry_id,
                "industry_name": industry_name,
                "search_terms": role.search_terms or [],
                "last_refreshed": role.last_refreshed.isoformat() if role.last_refreshed else None,
                "openings_count": total_openings,
                "work_mode_counts": mode_counts,
                "latest_salary": snap_data,
                "is_stale": is_stale
            })

        return results

    @staticmethod
    def get_role_jobs(
        db: Session,
        role_id: int,
        work_mode: Optional[str] = None,
        limit: int = 25
    ) -> List[Dict[str, Any]]:
        """
        Retrieves real live postings for a role, filtered by work_mode.
        """
        q = db.query(JobPosting).filter(JobPosting.role_id == role_id)
        if work_mode and work_mode.lower() not in ("all", "any"):
            q = q.filter(JobPosting.work_mode == work_mode.lower())

        postings = q.order_by(JobPosting.last_seen.desc()).limit(limit).all()
        out = []
        for p in postings:
            out.append({
                "id": p.id,
                "source": p.source,
                "external_id": p.external_id,
                "title": p.title,
                "company": p.company or "Hiring Company",
                "location": p.location or "Worldwide",
                "work_mode": p.work_mode,
                "salary_min": p.salary_min,
                "salary_max": p.salary_max,
                "currency": p.currency or "USD",
                "salary_is_estimated": p.salary_is_estimated,
                "url": p.url,
                "posted_at": p.posted_at.isoformat() if p.posted_at else None,
                "last_seen": p.last_seen.isoformat() if p.last_seen else None,
            })
        return out

    @staticmethod
    async def refresh_all(db: Session, max_roles: int = 15) -> Dict[str, Any]:
        """
        Crawls Remotive, Arbeitnow, and Adzuna for stalest roles, updates postings,
        and re-summarizes salary snapshots.
        """
        roles = NavigatorService.roles_stalest_first(db, limit=max_roles)
        total_fetched = 0
        countries = ("us", "gb")

        for role in roles:
            term = (role.search_terms[0] if role.search_terms else role.title)
            role_jobs: List[RawJob] = []

            for country in countries:
                # 1. Fetch Adzuna (if configured)
                adzuna_jobs = await fetch_adzuna(term, country=country, pages=1)
                role_jobs.extend(adzuna_jobs)

            # 2. Fetch Remotive free feed
            remotive_jobs = await fetch_remotive(term)
            role_jobs.extend(remotive_jobs)

            # 3. Fetch Arbeitnow free feed
            arbeitnow_jobs = await fetch_arbeitnow(term)
            role_jobs.extend(arbeitnow_jobs)

            total_fetched += len(role_jobs)

            if role_jobs:
                NavigatorService.upsert_postings(db, role, "us", role_jobs)

                # Summarize salaries across all modes and per mode
                for mode in ("remote", "hybrid", "onsite", None):
                    vals = []
                    est_count = 0
                    for j in role_jobs:
                        if mode is not None and j.work_mode != mode:
                            continue
                        val = annual_midpoint(j)
                        if val is not None:
                            vals.append(val)
                            if j.estimated:
                                est_count += 1

                    stats = summarize(vals, min_samples=4)  # lower threshold so live data surfaces sooner
                    if stats:
                        est_share = round(est_count / max(len(vals), 1), 2)
                        NavigatorService.save_snapshot(
                            db,
                            role_id=role.id,
                            country="us",
                            work_mode=mode,
                            stats=stats,
                            estimated_share=est_share,
                            source="live_feed_aggregator"
                        )

            NavigatorService.mark_refreshed(db, role)

        return {
            "status": "completed",
            "roles_refreshed": len(roles),
            "jobs_ingested": total_fetched
        }

    @staticmethod
    def check_manual_cooldown() -> Optional[int]:
        """
        Returns remaining cooldown seconds if still within 10-minute window, else None.
        """
        global _LAST_MANUAL_REFRESH
        if _LAST_MANUAL_REFRESH is None:
            return None
        now = datetime.now(timezone.utc)
        elapsed = (now - _LAST_MANUAL_REFRESH).total_seconds()
        remaining = int(MANUAL_REFRESH_COOLDOWN_SECONDS - elapsed)
        return remaining if remaining > 0 else None

    @staticmethod
    def record_manual_refresh() -> None:
        global _LAST_MANUAL_REFRESH
        _LAST_MANUAL_REFRESH = datetime.now(timezone.utc)

