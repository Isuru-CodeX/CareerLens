import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

_CONFIG_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(_CONFIG_DIR)))

def get_normalized_path(path_str: str) -> str:
    if os.path.isabs(path_str) or (len(path_str) >= 2 and path_str[1] == ":"):
        return os.path.abspath(path_str)
    if path_str.startswith("./") or path_str.startswith(".\\"):
        path_str = path_str[2:]
    return os.path.abspath(os.path.join(_PROJECT_ROOT, path_str))

def get_normalized_db_url(url: str) -> str:
    if url.startswith("sqlite:///"):
        raw_file = url[10:]
        if raw_file == ":memory:":
            return url
        # Check if absolute path already (Unix leading slash or Windows drive letter)
        if os.path.isabs(raw_file) or (len(raw_file) >= 2 and raw_file[1] == ":"):
            return f"sqlite:///{raw_file.replace(os.sep, '/')}"
        if raw_file.startswith("./") or raw_file.startswith(".\\"):
            raw_file = raw_file[2:]
        abs_file = os.path.abspath(os.path.join(_PROJECT_ROOT, raw_file)).replace("\\", "/")
        return f"sqlite:///{abs_file}"
    return url

class Settings(BaseSettings):
    PROJECT_NAME: str = "CareerLens AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-careerlens-production-grade-key-2026-change-in-prod")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./careerlens.db")
    
    # File Storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", os.path.join(_PROJECT_ROOT, "storage"))
    MAX_UPLOAD_SIZE_MB: int = 10
    
    # AI integration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Email / SMTP Settings
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "True").lower() in ("true", "1")
    EMAILS_FROM_EMAIL: str = os.getenv("EMAILS_FROM_EMAIL", "")
    EMAILS_FROM_NAME: str = os.getenv("EMAILS_FROM_NAME", "CareerLens AI")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]

    @property
    def RESOLVED_DATABASE_URL(self) -> str:
        return get_normalized_db_url(self.DATABASE_URL)

    @property
    def RESOLVED_UPLOAD_DIR(self) -> str:
        resolved = get_normalized_path(self.UPLOAD_DIR)
        os.makedirs(resolved, exist_ok=True)
        return resolved

    model_config = SettingsConfigDict(env_file=(".env", "backend/.env", "../.env"), extra="allow")

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
