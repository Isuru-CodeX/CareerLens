import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

class PDFService:
    @staticmethod
    def generate_analysis_report(
        resume_title: str,
        overall_score: float,
        structure_score: float,
        readability_score: float,
        impact_score: float,
        skills_score: float,
        strengths: list,
        weaknesses: list,
        recommendations: list,
        vague_phrases: list
    ) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40
        )
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#1e40af"),
            fontName="Helvetica-Bold"
        )
        
        subtitle_style = ParagraphStyle(
            "DocSubTitle",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#64748b")
        )

        h2_style = ParagraphStyle(
            "DocH2",
            parent=styles["Heading2"],
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#0f172a"),
            fontName="Helvetica-Bold",
            spaceBefore=12,
            spaceAfter=6
        )

        body_style = ParagraphStyle(
            "DocBody",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#334155")
        )

        disclaimer_style = ParagraphStyle(
            "DocDisclaimer",
            parent=styles["Normal"],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#64748b"),
            fontName="Helvetica-Oblique"
        )

        elements = []
        
        # Header
        elements.append(Paragraph("CareerLens AI - Resume Analysis Audit", title_style))
        elements.append(Paragraph(f"Target Document: {resume_title} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", subtitle_style))
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563eb"), spaceAfter=15))

        # Score Overview Table
        score_data = [
            ["Metric", "Score", "Rating Scale", "Guidance Status"],
            ["Overall Score", f"{overall_score}/100", "Composite Weighting", "Strong" if overall_score >= 80 else "Acceptable" if overall_score >= 65 else "Needs Enhancement"],
            ["Impact & Metrics", f"{impact_score}/100", "KPIs & Results (35%)", "Quantified" if impact_score >= 70 else "Add Metrics"],
            ["Resume Structure", f"{structure_score}/100", "Section Completeness (25%)", "Structured" if structure_score >= 75 else "Missing Headers"],
            ["Readability & Voice", f"{readability_score}/100", "Sentence Length & Tone (20%)", "Clear" if readability_score >= 75 else "Refine Length"],
            ["Skills Stack", f"{skills_score}/100", "Keyword Relevance (20%)", "Comprehensive" if skills_score >= 70 else "Expand Stack"]
        ]
        
        table = Table(score_data, colWidths=[140, 90, 150, 150])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#eff6ff")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#1e40af")),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 15))

        # Strengths
        elements.append(Paragraph("Identified Strengths", h2_style))
        if strengths:
            for s in strengths:
                elements.append(Paragraph(f"• <b>{s}</b>", body_style))
                elements.append(Spacer(1, 3))
        else:
            elements.append(Paragraph("Baseline resume structure detected. Review recommendations to build competitive differentiation.", body_style))
        elements.append(Spacer(1, 10))

        # Weaknesses / Focus Areas
        elements.append(Paragraph("High-Priority Areas for Improvement", h2_style))
        if weaknesses:
            for w in weaknesses:
                elements.append(Paragraph(f"• {w}", body_style))
                elements.append(Spacer(1, 3))
        elements.append(Spacer(1, 10))

        # Recommendations
        elements.append(Paragraph("Targeted Action Plan", h2_style))
        for r in recommendations[:5]:
            rec_title = r.get("title", "Recommendation") if isinstance(r, dict) else str(r)
            rec_desc = r.get("description", "") if isinstance(r, dict) else ""
            elements.append(Paragraph(f"<b>{rec_title}:</b> {rec_desc}", body_style))
            elements.append(Spacer(1, 4))
        elements.append(Spacer(1, 10))

        # Vague Phrases
        if vague_phrases:
            elements.append(Paragraph("Vague Phrase Detection & Stronger Alternatives", h2_style))
            vague_data = [["Detected Phrase", "Suggested Action Alternative"]]
            for vp in vague_phrases[:4]:
                if isinstance(vp, dict):
                    vague_data.append([vp.get("phrase", ""), vp.get("suggestion", "")])
            
            v_table = Table(vague_data, colWidths=[200, 330])
            v_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#fef2f2")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#991b1b")),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8.5),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#fca5a5")),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
            ]))
            elements.append(v_table)
            elements.append(Spacer(1, 15))

        # Disclaimer
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0"), spaceBefore=10, spaceAfter=8))
        elements.append(Paragraph(
            "DISCLAIMER: CareerLens AI guidance scores and feedback are algorithmic heuristic evaluations designed to assist candidate self-improvement. They do not constitute an employer ATS score guarantee or guarantee employment outcomes.",
            disclaimer_style
        ))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

