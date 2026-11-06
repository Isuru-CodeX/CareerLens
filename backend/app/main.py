from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
from app.core.config import settings
from app.core.database import Base, engine
from app.api import auth, users, resumes, jobs, ai, applications, dashboard

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
                    ("linkedin_url", "VARCHAR(255)"),
                    ("github_url", "VARCHAR(255)"),
                    ("portfolio_url", "VARCHAR(255)"),
                    ("other_links", "JSON")
                ]:
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE career_profiles ADD COLUMN {col_name} {col_type}"))
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
    yield

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

