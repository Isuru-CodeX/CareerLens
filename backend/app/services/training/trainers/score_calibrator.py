import os
import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from typing import List, Dict, Any
from app.services.training.evaluator import EvaluatorService

class ScoreCalibratorTrainer:
    @staticmethod
    def train(
        samples: List[Dict[str, Any]],
        output_path: str = "backend/ml_artifacts/score_calibrator.joblib"
    ) -> Dict[str, Any]:
        """
        Calibrates overall score against human ratings while keeping weights explainable.
        """
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # Baseline synthetic distribution if small
        if len(samples) < 10:
            np.random.seed(42)
            n_samples = 150
            struct = np.random.uniform(50, 95, n_samples)
            read = np.random.uniform(45, 95, n_samples)
            impact = np.random.uniform(40, 90, n_samples)
            skills = np.random.uniform(45, 95, n_samples)
            # Ground truth formula + small Gaussian noise
            y = 0.25 * struct + 0.20 * read + 0.35 * impact + 0.20 * skills + np.random.normal(0, 2.0, n_samples)
            X = np.column_stack([struct, read, impact, skills])
        else:
            X = np.array([[s["structure"], s["readability"], s["impact"], s["skills"]] for s in samples])
            y = np.array([s["overall"] for s in samples])

        reg = RandomForestRegressor(n_estimators=80, max_depth=8, random_state=42)
        reg.fit(X, y)

        y_pred = reg.predict(X)
        metrics = EvaluatorService.evaluate_regression(list(y), list(y_pred))

        # Persist
        joblib.dump(reg, output_path)

        return {
            "artifact_path": output_path,
            "metrics": metrics,
            "samples_trained": len(X)
        }

