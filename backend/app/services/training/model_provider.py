import os
import joblib
from typing import Optional, Any, Dict
from sqlalchemy.orm import Session
from app.services.training.registry import ModelRegistryService

class ModelProvider:
    """
    Singleton provider that loads active trained model artifacts with in-memory caching.
    If no model is active, artifact is missing, or loading raises an exception,
    it returns None so callers transparently fall back to the heuristic engine.
    """
    _cache: Dict[str, Any] = {}
    _cached_versions: Dict[str, str] = {}

    @classmethod
    def get_model(cls, db: Session, model_type: str) -> Optional[Any]:
        active_ver = ModelRegistryService.get_active_model(db, model_type)
        if not active_ver:
            return None

        # Cache check
        if model_type in cls._cache and cls._cached_versions.get(model_type) == active_ver.id:
            return cls._cache[model_type]

        if not active_ver.artifact_path or not os.path.exists(active_ver.artifact_path):
            return None

        try:
            artifact = joblib.load(active_ver.artifact_path)
            cls._cache[model_type] = artifact
            cls._cached_versions[model_type] = active_ver.id
            return artifact
        except Exception as e:
            print(f"[ModelProvider] Failed loading artifact for {model_type}: {e}")
            return None

    @classmethod
    def clear_cache(cls):
        cls._cache.clear()
        cls._cached_versions.clear()

