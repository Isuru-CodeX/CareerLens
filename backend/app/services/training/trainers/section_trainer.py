import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from typing import List, Tuple, Dict, Any
from app.services.training.evaluator import EvaluatorService

class SectionTrainer:
    @staticmethod
    def train(
        train_samples: List[Tuple[str, str]], # (text, section_label)
        val_samples: List[Tuple[str, str]],
        output_path: str = "backend/ml_artifacts/section_classifier.joblib"
    ) -> Dict[str, Any]:
        """
        Trains TF-IDF + LogisticRegression model on section text blocks.
        """
        # Ensure training directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # Baseline fallback samples if small set
        if len(train_samples) < 5:
            train_samples = [
                ("Professional Summary: Experienced full-stack developer with 5 years building scalable web applications.", "summary"),
                ("Senior Software Engineer at Tech Corp. Led microservices development with FastAPI.", "experience"),
                ("Technical Skills: Python, TypeScript, React, Docker, Kubernetes, AWS.", "skills"),
                ("Bachelor of Science in Computer Science, University of California, Berkeley.", "education"),
                ("Personal Projects: CareerLens AI Resume Intelligence Platform built with FastAPI.", "projects")
            ]

        X_train = [s[0] for s in train_samples]
        y_train = [s[1] for s in train_samples]

        pipe = Pipeline([
            ("tfidf", TfidfVectorizer(max_features=2500, stop_words="english", ngram_range=(1, 2))),
            ("clf", LogisticRegression(max_iter=300, C=1.5))
        ])

        pipe.fit(X_train, y_train)

        # Validation evaluation
        if not val_samples:
            val_samples = train_samples

        X_val = [s[0] for s in val_samples]
        y_val = [s[1] for s in val_samples]
        y_pred = pipe.predict(X_val)

        labels = sorted(list(set(y_train)))
        metrics = EvaluatorService.evaluate_classification(y_val, list(y_pred), labels)

        # Persist model artifact
        joblib.dump(pipe, output_path)

        return {
            "artifact_path": output_path,
            "metrics": metrics,
            "samples_trained": len(train_samples)
        }

