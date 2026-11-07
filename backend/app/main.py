import asyncio
import os
import logging
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.models.models import SalarySnapshot
from app.services.navigator_service import NavigatorService
from app.api import (
    auth, users, resumes, jobs, ai, applications,
    dashboard, experiences, activity, cv, profile, presets, cover_letters, text, interviews, career_navigator, navigator,
    xai, github_verifier, coding, placement
)

logger = logging.getLogger(__name__)


async def run_salary_refresh_job(max_roles: int = 15):
    """Periodic background task executing live job market crawls every 6 hours."""
    db = SessionLocal()
    try:
        logger.info("Executing scheduled live job market & salary refresh...")
        await NavigatorService.refresh_all(db, max_roles=max_roles)
        logger.info("Scheduled salary refresh finished successfully.")
    except Exception as e:
        logger.warning("Scheduled salary refresh encountered an error: %s", e)
    finally:
        db.close()


async def refresh_if_stale():
    """Startup trigger: refreshes stalest roles if the latest snapshot is older than 6 hours."""
    db = SessionLocal()
    try:
        latest = db.query(SalarySnapshot).order_by(SalarySnapshot.fetched_at.desc()).first()
        now = datetime.now(timezone.utc)
        should_refresh = False
        if latest is None:
            should_refresh = True
        else:
            fetched = latest.fetched_at
            if fetched.tzinfo is None:
                fetched = fetched.replace(tzinfo=timezone.utc)
            if (now - fetched) > timedelta(hours=6):
                should_refresh = True

        if should_refresh:
            logger.info("Live market data is stale (>6 hrs) or empty. Triggering startup refresh...")
            await NavigatorService.refresh_all(db, max_roles=10)
    except Exception as e:
        logger.warning("Startup refresh_if_stale error: %s", e)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    Base.metadata.create_all(bind=engine)
    # Ensure existing SQLite tables have newly added columns
    with engine.connect() as conn:
        try:
            from sqlalchemy import text
            res = conn.execute(text("PRAGMA table_info(career_profiles)"))
            existing_cols = [row[1] for row in res.fetchall()]
            if existing_cols:
                for col_name, col_type in [
                    ("phone", "VARCHAR(50)"),
                    ("address_line1", "VARCHAR(255)"),
                    ("city", "VARCHAR(100)"),
                    ("region", "VARCHAR(100)"),
                    ("postal_code", "VARCHAR(50)"),
                    ("country", "VARCHAR(100)"),
                    ("linkedin_url", "VARCHAR(255)"),
                    ("github_url", "VARCHAR(255)"),
                    ("portfolio_url", "VARCHAR(255)"),
                    ("other_links", "JSON")
                ]:
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE career_profiles ADD COLUMN {col_name} {col_type}"))
                conn.commit()

            res_u = conn.execute(text("PRAGMA table_info(users)"))
            existing_u_cols = [row[1] for row in res_u.fetchall()]
            if existing_u_cols:
                if "avatar_path" not in existing_u_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN avatar_path VARCHAR(500)"))
                if "avatar_url" not in existing_u_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)"))
                if "avatar_source" not in existing_u_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN avatar_source VARCHAR(50) DEFAULT 'manual'"))
                if "email_verified_at" not in existing_u_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN email_verified_at DATETIME"))
                conn.commit()

            res_r = conn.execute(text("PRAGMA table_info(resumes)"))
            existing_r_cols = [row[1] for row in res_r.fetchall()]
            if existing_r_cols:
                if "sha256" not in existing_r_cols:
                    conn.execute(text("ALTER TABLE resumes ADD COLUMN sha256 VARCHAR(64)"))
                if "role_category" not in existing_r_cols:
                    conn.execute(text("ALTER TABLE resumes ADD COLUMN role_category VARCHAR(100)"))
                if "preview_path" not in existing_r_cols:
                    conn.execute(text("ALTER TABLE resumes ADD COLUMN preview_path VARCHAR(500)"))
                if "parsed_json" not in existing_r_cols:
                    conn.execute(text("ALTER TABLE resumes ADD COLUMN parsed_json JSON"))
                conn.commit()

            res_jm = conn.execute(text("PRAGMA table_info(job_matches)"))
            existing_jm_cols = [row[1] for row in res_jm.fetchall()]
            if existing_jm_cols:
                if "analysis" not in existing_jm_cols:
                    conn.execute(text("ALTER TABLE job_matches ADD COLUMN analysis JSON"))
                if "engine" not in existing_jm_cols:
                    conn.execute(text("ALTER TABLE job_matches ADD COLUMN engine VARCHAR(20)"))
                conn.commit()
        except Exception:
            pass

    # Seed Navigator Taxonomy and Baseline Data
    db_init = SessionLocal()
    try:
        NavigatorService.ensure_seed_data(db_init)
    except Exception as e:
        logger.warning("Error seeding Navigator taxonomy: %s", e)
    finally:
        db_init.close()

    # Start APScheduler for automatic salary refresh every 6 hours
    scheduler = None
    if os.getenv("DISABLE_SCHEDULER", "0") != "1" and os.getenv("TESTING", "0") != "1":
        try:
            from apscheduler.schedulers.asyncio import AsyncIOScheduler
            scheduler = AsyncIOScheduler()
            scheduler.add_job(
                run_salary_refresh_job,
                "interval",
                hours=6,
                id="salary_refresh",
                max_instances=1,
                coalesce=True,
                misfire_grace_time=3600
            )
            scheduler.start()
            asyncio.create_task(refresh_if_stale())
            logger.info("APScheduler initialized for Career Navigator live data refresh.")
        except Exception as e:
            logger.warning("Could not start APScheduler: %s", e)

    yield

    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="CareerLens AI - Production-grade Resume Analyzer, Job Matcher, and Application Tracker API",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/openapi.json"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin for origin in settings.CORS_ORIGINS if origin != "*"],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, (StarletteHTTPException, RequestValidationError)):
        raise exc
    # Log securely without exposing stack traces to end users in production
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal error occurred. Please try again or check the system logs."}
    )

# Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(resumes.router, prefix=settings.API_V1_STR)
app.include_router(jobs.router, prefix=settings.API_V1_STR)
app.include_router(ai.router, prefix=settings.API_V1_STR)
app.include_router(applications.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(experiences.router, prefix=settings.API_V1_STR)
app.include_router(activity.router, prefix=settings.API_V1_STR)
app.include_router(cv.router, prefix=settings.API_V1_STR)
app.include_router(profile.router, prefix=settings.API_V1_STR)
app.include_router(presets.router, prefix=settings.API_V1_STR)
app.include_router(cover_letters.router, prefix=settings.API_V1_STR)
app.include_router(text.router, prefix=settings.API_V1_STR)
app.include_router(interviews.router, prefix=settings.API_V1_STR)
app.include_router(career_navigator.router, prefix=settings.API_V1_STR)
app.include_router(navigator.router, prefix=settings.API_V1_STR)
app.include_router(xai.router, prefix=settings.API_V1_STR)
app.include_router(github_verifier.router, prefix=settings.API_V1_STR)
app.include_router(coding.router, prefix=settings.API_V1_STR)
app.include_router(placement.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "documentation": "/docs",
        "disclaimer": "CareerLens AI provides algorithmic guidance and feedback. Not an employer ATS score guarantee."
    }

@app.get("/health")
def health():
    return {"status": "healthy", "service": "careerlens-backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

