from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

db_url = settings.RESOLVED_DATABASE_URL
engine_args = {}
if db_url.startswith("sqlite"):
    engine_args["connect_args"] = {"check_same_thread": False}

engine = create_engine(db_url, **engine_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def init_db():
    from sqlalchemy import text
    import app.models.models  # ensure models are registered
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            # career_profiles
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

            # users
            res_u = conn.execute(text("PRAGMA table_info(users)"))
            existing_u_cols = [row[1] for row in res_u.fetchall()]
            if existing_u_cols:
                for col_name, col_type in [
                    ("avatar_path", "VARCHAR(500)"),
                    ("avatar_url", "VARCHAR(500)"),
                    ("avatar_source", "VARCHAR(50) DEFAULT 'manual'"),
                    ("email_verified_at", "DATETIME"),
                    ("is_admin", "BOOLEAN DEFAULT 0"),
                    ("role", "VARCHAR(50) DEFAULT 'candidate'")
                ]:
                    if col_name not in existing_u_cols:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                conn.execute(text("UPDATE users SET is_admin = 1, role = 'admin' WHERE email = 'demo@careerlens.ai'"))
                conn.commit()

            # resumes
            res_r = conn.execute(text("PRAGMA table_info(resumes)"))
            existing_r_cols = [row[1] for row in res_r.fetchall()]
            if existing_r_cols:
                for col_name, col_type in [
                    ("sha256", "VARCHAR(64)"),
                    ("role_category", "VARCHAR(100)"),
                    ("preview_path", "VARCHAR(500)"),
                    ("parsed_json", "JSON")
                ]:
                    if col_name not in existing_r_cols:
                        conn.execute(text(f"ALTER TABLE resumes ADD COLUMN {col_name} {col_type}"))
                conn.commit()

            # user_skills
            res_us = conn.execute(text("PRAGMA table_info(user_skills)"))
            existing_us_cols = [row[1] for row in res_us.fetchall()]
            if existing_us_cols:
                for col_name, col_type in [
                    ("proficiency_estimate", "VARCHAR(50) DEFAULT 'Intermediate'"),
                    ("confidence", "FLOAT DEFAULT 0.7"),
                    ("verification_status", "VARCHAR(50) DEFAULT 'mentioned'"),
                    ("evidence_summary", "TEXT"),
                    ("last_updated", "DATETIME"),
                    ("user_confirmed", "BOOLEAN DEFAULT 0")
                ]:
                    if col_name not in existing_us_cols:
                        conn.execute(text(f"ALTER TABLE user_skills ADD COLUMN {col_name} {col_type}"))
                conn.commit()

            # job_matches
            res_jm = conn.execute(text("PRAGMA table_info(job_matches)"))
            existing_jm_cols = [row[1] for row in res_jm.fetchall()]
            if existing_jm_cols:
                if "analysis" not in existing_jm_cols:
                    conn.execute(text("ALTER TABLE job_matches ADD COLUMN analysis JSON"))
                if "engine" not in existing_jm_cols:
                    conn.execute(text("ALTER TABLE job_matches ADD COLUMN engine VARCHAR(20)"))
                conn.commit()

            # Additional Admin & Training Center Migrations
            # users additions
            if existing_u_cols:
                for col_name, col_type in [
                    ("last_login_at", "DATETIME"),
                    ("training_consent", "BOOLEAN DEFAULT 0"),
                    ("training_consent_at", "DATETIME")
                ]:
                    if col_name not in existing_u_cols:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                conn.commit()

            # resumes additions
            if existing_r_cols:
                for col_name, col_type in [
                    ("parse_status", "VARCHAR(30) DEFAULT 'parsed'"),
                    ("parse_warnings", "JSON")
                ]:
                    if col_name not in existing_r_cols:
                        conn.execute(text(f"ALTER TABLE resumes ADD COLUMN {col_name} {col_type}"))
                conn.commit()

            # analysis_runs additions
            res_ar = conn.execute(text("PRAGMA table_info(analysis_runs)"))
            existing_ar_cols = [row[1] for row in res_ar.fetchall()]
            if existing_ar_cols:
                for col_name, col_type in [
                    ("model_versions", "JSON"),
                    ("scoring_config_id", "VARCHAR(36)")
                ]:
                    if col_name not in existing_ar_cols:
                        conn.execute(text(f"ALTER TABLE analysis_runs ADD COLUMN {col_name} {col_type}"))
                conn.commit()

            # audit_logs additions
            res_al = conn.execute(text("PRAGMA table_info(audit_logs)"))
            existing_al_cols = [row[1] for row in res_al.fetchall()]
            if existing_al_cols:
                for col_name, col_type in [
                    ("actor_role", "VARCHAR(50)"),
                    ("target_type", "VARCHAR(50)"),
                    ("target_id", "VARCHAR(100)")
                ]:
                    if col_name not in existing_al_cols:
                        conn.execute(text(f"ALTER TABLE audit_logs ADD COLUMN {col_name} {col_type}"))
                conn.commit()

        except Exception as e:
            pass

# Initialize DB on load
init_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

