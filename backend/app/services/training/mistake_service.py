import uuid
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import MistakeReport, RegressionTest, LanguageRule, SkillTaxonomy

class MistakeService:
    @staticmethod
    def create_report(
        db: Session,
        source: str,
        component: str,
        predicted: Dict[str, Any],
        corrected: Dict[str, Any],
        error_type: str,
        severity: str = "medium",
        document_id: Optional[str] = None,
        resume_id: Optional[str] = None,
        model_version_id: Optional[str] = None
    ) -> MistakeReport:
        report = MistakeReport(
            id=str(uuid.uuid4()),
            source=source,
            component=component,
            document_id=document_id,
            resume_id=resume_id,
            model_version_id=model_version_id,
            predicted=predicted,
            corrected=corrected,
            error_type=error_type,
            severity=severity,
            status="open"
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return report

    @staticmethod
    def resolve_mistake(
        db: Session,
        mistake_id: str,
        resolution_type: str,
        resolution_note: str,
        resolved_by_id: str,
        create_regression_test: bool = True
    ) -> MistakeReport:
        report = db.query(MistakeReport).filter(MistakeReport.id == mistake_id).first()
        if not report:
            raise ValueError(f"Mistake report '{mistake_id}' not found.")

        report.status = "resolved"
        report.resolution_type = resolution_type
        report.resolution_note = resolution_note
        report.resolved_by = resolved_by_id

        # 1. Action: rule update in 1-click
        if resolution_type == "rule_updated":
            corrected = report.corrected or {}
            if report.component == "phrase" or "vague_phrase" in report.error_type:
                phrase = corrected.get("phrase") or report.predicted.get("text")
                if phrase:
                    rule = db.query(LanguageRule).filter(LanguageRule.phrase == phrase).first()
                    if not rule:
                        rule = LanguageRule(
                            rule_type="vague_phrase",
                            phrase=phrase,
                            severity=report.severity,
                            suggested_replacements=corrected.get("replacements", ["spearheaded", "executed", "delivered"])
                        )
                        db.add(rule)
            elif report.component == "skill" or "skill" in report.error_type:
                canonical = corrected.get("canonical")
                alias = corrected.get("alias")
                if canonical and alias:
                    tax = db.query(SkillTaxonomy).filter(SkillTaxonomy.canonical_name == canonical).first()
                    if tax:
                        aliases = list(tax.aliases or [])
                        if alias not in aliases:
                            aliases.append(alias)
                            tax.aliases = aliases
                    else:
                        tax = SkillTaxonomy(canonical_name=canonical, category="Technical", aliases=[alias])
                        db.add(tax)

        # 2. Automatically generate permanent Regression Test
        if create_regression_test:
            reg_test = RegressionTest(
                id=str(uuid.uuid4()),
                mistake_id=report.id,
                name=f"Regression Guard: {report.error_type} in {report.component}",
                component=report.component,
                input_sample=report.predicted,
                expected_output=report.corrected,
                strictness="exact" if report.component in ("section", "skill") else "range"
            )
            db.add(reg_test)
            db.flush()
            report.regression_test_id = reg_test.id

        db.commit()
        db.refresh(report)
        return report

