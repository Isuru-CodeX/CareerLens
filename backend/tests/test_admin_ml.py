"""
backend/tests/test_admin_ml.py
------------------------------
Unit & integration tests for Admin Command Center and ML Training Engine.
"""

import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import SessionLocal, Base, engine, init_db
from app.models.models import User
from app.services.ml_training_service import MLTrainingService

@pytest.fixture(autouse=True, scope="module")
def setup_test_db():
    app.dependency_overrides.clear()
    init_db()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        demo_user = db.query(User).filter(User.email == "demo@careerlens.ai").first()
        if not demo_user:
            demo_user = User(
                email="demo@careerlens.ai",
                hashed_password="test_hashed_password",
                full_name="CareerLens Demo Admin",
                is_active=True,
                is_admin=True,
                role="admin"
            )
            db.add(demo_user)
            db.commit()
        else:
            demo_user.is_admin = True
            demo_user.role = "admin"
            db.commit()
    finally:
        db.close()
    yield

client = TestClient(app)


def test_ml_salary_regressor_training():
    db = SessionLocal()
    try:
        metrics = MLTrainingService.train_salary_regressor(db)
        assert metrics is not None
        assert metrics["status"] == "active_hot_reloaded"
        assert metrics["r2_score"] >= 0.80
        assert metrics["samples_trained"] > 0
        assert os.path.exists(metrics["artifact_path"])
    finally:
        db.close()


def test_ml_vector_rag_reindex():
    results = MLTrainingService.reindex_vector_rag()
    assert results is not None
    assert results["status"] == "reindexed_and_calibrated"
    assert results["dimensions"] == 256
    assert results["benchmark_results"]["meets_spec"] is True
    assert results["benchmark_results"]["hybrid_ndcg_at_3"] >= 0.85


def test_admin_endpoints_with_demo_user():
    # Demo user is allowed administrative access
    r_stats = client.get("/api/admin/stats")
    assert r_stats.status_code == 200
    data = r_stats.json()
    assert "kpis" in data
    assert "system" in data

    r_models = client.get("/api/admin/ai/models")
    assert r_models.status_code == 200
    models_list = r_models.json()
    assert len(models_list) >= 3

    r_train = client.post("/api/admin/ai/train-salary")
    assert r_train.status_code == 200
    assert "metrics" in r_train.json()

    r_reindex = client.post("/api/admin/ai/reindex-rag")
    assert r_reindex.status_code == 200
    assert "results" in r_reindex.json()

    r_roles = client.get("/api/admin/taxonomy/roles")
    assert r_roles.status_code == 200
    assert r_roles.json()["total_roles"] > 0

    r_users = client.get("/api/admin/users")
    assert r_users.status_code == 200
    assert "items" in r_users.json()
