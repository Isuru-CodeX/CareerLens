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
                    ("email_verified_at", "DATETIME")
                ]:
                    if col_name not in existing_u_cols:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
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

            # job_matches
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

# Initialize DB on load
init_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

