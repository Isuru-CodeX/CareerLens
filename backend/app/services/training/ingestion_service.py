import hashlib
import io
import zipfile
from typing import Dict, Any, List, Tuple
from app.services.training.anonymizer import AnonymizerService

class IngestionService:
    @staticmethod
    def compute_sha256(content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()

    @staticmethod
    def extract_text(content: bytes, filename: str) -> Tuple[str, List[str]]:
        """
        Extracts raw text from PDF, DOCX, or TXT file contents.
        """
        lower = filename.lower()
        warnings = []
        text = ""

        try:
            if lower.endswith(".pdf"):
                try:
                    from pypdf import PdfReader
                    reader = PdfReader(io.BytesIO(content))
                    pages = [p.extract_text() or "" for p in reader.pages]
                    text = "\n".join(pages)
                    if not text.strip():
                        warnings.append("PDF produced empty text; might be scanned image.")
                except Exception as e:
                    warnings.append(f"PyPDF extraction warning: {str(e)}")
                    text = content.decode("utf-8", errors="ignore")

            elif lower.endswith(".docx"):
                try:
                    from docx import Document
                    doc = Document(io.BytesIO(content))
                    paragraphs = [p.text for p in doc.paragraphs if p.text]
                    text = "\n".join(paragraphs)
                except Exception as e:
                    warnings.append(f"DOCX extraction warning: {str(e)}")
                    text = content.decode("utf-8", errors="ignore")

            else:
                text = content.decode("utf-8", errors="ignore")

        except Exception as e:
            warnings.append(f"Text extraction failed: {str(e)}")

        return text.strip(), warnings

    @staticmethod
    def calculate_quality_score(text: str) -> float:
        """
        Computes ingestion quality score (0.0 to 1.0) based on text length,
        character diversity, and presence of standard CV section keywords.
        """
        if not text or len(text.strip()) < 100:
            return 0.1

        score = 0.5
        length = len(text)
        if length > 500:
            score += 0.2
        if length > 1200:
            score += 0.1

        lower = text.lower()
        keywords = ["experience", "education", "skills", "projects", "summary"]
        found = sum(1 for kw in keywords if kw in lower)
        score += min(0.2, (found / len(keywords)) * 0.2)

        return round(min(1.0, score), 2)

    @staticmethod
    def assign_split(index: int, total: int = 100, seed: int = 42) -> str:
        """
        Assigns deterministic stratified dataset split: 70% train, 15% val, 15% test.
        """
        # Deterministic hash modulo
        h = int(hashlib.md5(f"{seed}_{index}".encode()).hexdigest(), 16) % 100
        if h < 70:
            return "train"
        elif h < 85:
            return "val"
        else:
            return "test"

    @staticmethod
    def process_zip_archive(zip_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Extracts and ingests multiple files from an uploaded ZIP archive.
        """
        results = []
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
            for item in z.infolist():
                if item.is_dir() or item.filename.startswith("__MACOSX"):
                    continue
                name = item.filename.split("/")[-1]
                if not name.lower().endswith((".pdf", ".docx", ".txt", ".md")):
                    continue
                content = z.read(item.filename)
                results.append({
                    "filename": name,
                    "content": content,
                    "size": len(content)
                })
        return results

    @staticmethod
    def pre_label_document(text: str) -> Dict[str, Any]:
        """
        Pre-labels sections, skills, and draft scores using existing heuristic models
        so the Annotation Workbench has structured pre-annotations.
        """
        lower = text.lower()
        sections = []
        current_pos = 0

        section_markers = [
            ("summary", ["summary", "profile", "about"]),
            ("experience", ["experience", "employment", "work history"]),
            ("skills", ["skills", "technical skills", "competencies"]),
            ("education", ["education", "academic", "degree"]),
            ("projects", ["projects", "personal projects"]),
            ("certifications", ["certifications", "licenses"])
        ]

        for label, markers in section_markers:
            for m in markers:
                idx = lower.find(m)
                if idx != -1:
                    sections.append({
                        "label": label,
                        "start": idx,
                        "end": min(len(text), idx + 300)
                    })
                    break

        detected_skills = []
        sample_skills = ["Python", "FastAPI", "React", "TypeScript", "SQL", "Docker", "Kubernetes", "AWS", "Git"]
        for s in sample_skills:
            if s.lower() in lower:
                detected_skills.append({
                    "text": s,
                    "canonical": s,
                    "level": "Intermediate"
                })

        return {
            "sections": sections,
            "skills": detected_skills,
            "human_scores": {
                "structure": 75.0,
                "readability": 80.0,
                "impact": 70.0,
                "skills": 75.0,
                "overall": 74.0
            }
        }

