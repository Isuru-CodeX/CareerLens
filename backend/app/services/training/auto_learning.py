from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models.models import FeatureFlag, Annotation, MistakeReport

class AutoLearningService:
    @staticmethod
    def get_settings(db: Session) -> Dict[str, Any]:
        flags = db.query(FeatureFlag).all()
        flag_map = {f.key: f.enabled for f in flags}
        return {
            "learn_from_mistakes": flag_map.get("auto_learn_mistakes", True),
            "learn_from_consented_users": flag_map.get("auto_learn_user_corrections", False),
            "online_import_scheduled": flag_map.get("auto_import_scheduled", False),
            "auto_evaluate_candidate": flag_map.get("auto_evaluate_candidate", True),
            "auto_promote_enabled": flag_map.get("auto_promote_enabled", False),
            "batch_retrain_threshold": 100
        }

    @staticmethod
    def update_settings(db: Session, settings: Dict[str, Any]) -> Dict[str, Any]:
        for key, val in settings.items():
            flag_key = f"auto_{key}" if not key.startswith("auto_") else key
            flag = db.query(FeatureFlag).filter(FeatureFlag.key == flag_key).first()
            if flag:
                flag.enabled = bool(val)
            else:
                db.add(FeatureFlag(key=flag_key, enabled=bool(val), description=f"Auto-learning setting: {key}"))
        db.commit()
        return AutoLearningService.get_settings(db)

    @staticmethod
    def check_learning_triggers(db: Session) -> Dict[str, Any]:
        """
        Calculates approved annotations and resolved mistakes to determine
        if an automated training cycle is recommended.
        """
        approved_count = db.query(Annotation).filter(Annotation.status == "approved").count()
        resolved_mistakes = db.query(MistakeReport).filter(MistakeReport.status == "resolved").count()
        threshold = 50

        triggered = (approved_count + resolved_mistakes) >= threshold
        return {
            "approved_annotations": approved_count,
            "resolved_mistakes": resolved_mistakes,
            "threshold": threshold,
            "training_recommended": triggered
        }

