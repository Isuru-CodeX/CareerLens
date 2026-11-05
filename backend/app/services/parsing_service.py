import re
import os
from typing import Dict, Any, List
from pypdf import PdfReader
from docx import Document

EMAIL_REGEX = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
PHONE_REGEX = r'(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?'
LINKEDIN_REGEX = r'linkedin\.com\/in\/[a-zA-Z0-9_-]+'
GITHUB_REGEX = r'github\.com\/[a-zA-Z0-9_-]+'

KNOWN_TECH_SKILLS = [
    "python", "javascript", "typescript", "react", "react.js", "next.js", "vue", "angular",
    "node.js", "nodejs", "express", "fastapi", "flask", "django", "java", "spring boot", "c++", "c#",
    ".net", "go", "golang", "rust", "php", "ruby", "rails", "sql", "postgresql", "postgres",
    "mysql", "mongodb", "redis", "elasticsearch", "sqlite", "graphql", "rest api", "restful",
    "docker", "kubernetes", "aws", "azure", "gcp", "google cloud", "ci/cd", "git", "github",
    "terraform", "ansible", "linux", "html5", "css3", "tailwind", "tailwind css", "sass",
    "microservices", "unit testing", "pytest", "jest", "playwright", "cypress",
    "machine learning", "deep learning", "nlp", "llm", "pandas", "numpy", "scikit-learn",
    "tensorflow", "pytorch", "data analysis", "data engineering", "spark", "kafka", "tableau"
]

KNOWN_SOFT_SKILLS = [
    "leadership", "project management", "communication", "problem solving", "cross-functional collaboration",
    "agile", "scrum", "mentorship", "strategic planning", "stakeholder management", "adaptability", "critical thinking"
]

class ParsingService:
    @staticmethod
    def extract_text_from_file(file_path: str, file_type: str) -> str:
        text = ""
        file_type = file_type.lower().replace(".", "")
        if file_type == "pdf":
            try:
                reader = PdfReader(file_path)
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
            except Exception as e:
                text = f"[PDF extraction notice: {str(e)}]"
        elif file_type in ["docx", "doc"]:
            try:
                doc = Document(file_path)
                for para in doc.paragraphs:
                    if para.text:
                        text += para.text + "\n"
                for table in doc.tables:
                    for row in table.rows:
                        row_text = " | ".join([cell.text.strip() for cell in row.cells if cell.text.strip()])
                        if row_text:
                            text += row_text + "\n"
            except Exception as e:
                text = f"[DOCX extraction notice: {str(e)}]"
        else:
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    text = f.read()
            except Exception as e:
                text = f"[Text extraction notice: {str(e)}]"
        return text.strip()

    @staticmethod
    def parse_resume(raw_text: str) -> Dict[str, Any]:
        lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
        
        # 1. Contact Details
        emails = re.findall(EMAIL_REGEX, raw_text)
        phones = re.findall(PHONE_REGEX, raw_text)
        phone_matches = []
        for p in phones:
            p_str = "".join([part for part in p if part])
            if len(p_str) >= 7:
                phone_matches.append(p_str)
        
        linkedins = re.findall(LINKEDIN_REGEX, raw_text, re.IGNORECASE)
        githubs = re.findall(GITHUB_REGEX, raw_text, re.IGNORECASE)
        
        candidate_name = lines[0] if lines else "Candidate Name"
        if len(candidate_name) > 60 or "@" in candidate_name or any(char.isdigit() for char in candidate_name):
            # Fallback search in top 3 lines
            for l in lines[:3]:
                if len(l) < 50 and not "@" in l and not any(char.isdigit() for char in l):
                    candidate_name = l
                    break

        contact_info = {
            "name": candidate_name,
            "email": emails[0] if emails else None,
            "phone": phone_matches[0] if phone_matches else None,
            "linkedin": f"https://{linkedins[0]}" if linkedins else None,
            "github": f"https://{githubs[0]}" if githubs else None,
            "location": None
        }
        
        # Look for location clues in header
        for l in lines[:6]:
            if re.search(r'\b[A-Z][a-zA-Z\s]+,\s*(?:[A-Z]{2}|[A-Za-z\s]+)\b', l):
                if not "@" in l and not "linkedin" in l.lower() and not "github" in l.lower():
                    contact_info["location"] = l
                    break

        # 2. Section detection
        section_headers = {
            "summary": ["summary", "professional summary", "about me", "profile", "executive summary", "objective"],
            "experience": ["experience", "work experience", "employment history", "professional experience", "work history"],
            "education": ["education", "academic background", "degrees", "university"],
            "skills": ["skills", "technical skills", "core competencies", "skills & tools", "technologies"],
            "projects": ["projects", "personal projects", "key projects", "notable projects"],
            "certifications": ["certifications", "licenses", "certificates", "credentials"]
        }
        
        classified_sections: Dict[str, List[str]] = {
            "summary": [],
            "experience": [],
            "education": [],
            "skills": [],
            "projects": [],
            "certifications": [],
            "other": []
        }
        
        current_section = "summary"
        
        for line in lines:
            normalized = line.lower().strip().rstrip(":")
            # Check if this line is a section header
            matched_header = None
            for sec, keywords in section_headers.items():
                if normalized in keywords or any(normalized == kw for kw in keywords):
                    matched_header = sec
                    break
            
            if matched_header:
                current_section = matched_header
                continue
            
            classified_sections[current_section].append(line)

        # 3. Extract Skills detected
        detected_skills = []
        lower_text = raw_text.lower()
        for skill in KNOWN_TECH_SKILLS:
            # Match whole words or phrase
            pattern = r'\b' + re.escape(skill) + r'\b'
            if re.search(pattern, lower_text):
                # Search evidence snippet
                snippet = ""
                for line in lines:
                    if skill in line.lower():
                        snippet = line
                        break
                detected_skills.append({
                    "name": skill.title() if len(skill) > 3 and not skill in ["aws", "sql", "nlp", "llm", "gcp", "css3", "html5"] else skill.upper(),
                    "category": "technical",
                    "evidence": snippet[:180] if snippet else "Mentioned in resume profile",
                    "proficiency": "Proficient"
                })
                
        for skill in KNOWN_SOFT_SKILLS:
            pattern = r'\b' + re.escape(skill) + r'\b'
            if re.search(pattern, lower_text):
                detected_skills.append({
                    "name": skill.title(),
                    "category": "soft",
                    "evidence": "Mentioned in experience or summary",
                    "proficiency": "Competent"
                })

        # 4. Structured Experience Items
        experience_items = []
        curr_exp = None
        for line in classified_sections["experience"]:
            # Check if line looks like job title / company / date
            is_date_line = bool(re.search(r'\b(19|20)\d{2}\b|\b(present|current|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b', line, re.I))
            if is_date_line and (len(line.split()) < 12):
                if curr_exp:
                    experience_items.append(curr_exp)
                curr_exp = {
                    "title": line,
                    "company": "Company",
                    "date": line,
                    "bullets": []
                }
            elif line.startswith(("-", "•", "*", "–")) or (curr_exp and not curr_exp["bullets"]):
                clean_bullet = line.lstrip("-•*– ").strip()
                if curr_exp:
                    curr_exp["bullets"].append(clean_bullet)
                else:
                    curr_exp = {
                        "title": "Role Experience",
                        "company": "",
                        "date": "",
                        "bullets": [clean_bullet]
                    }
            elif curr_exp:
                curr_exp["bullets"].append(line)
        if curr_exp:
            experience_items.append(curr_exp)

        # 5. Structured Education Items
        education_items = []
        for line in classified_sections["education"]:
            if any(term in line.lower() for term in ["bachelor", "master", "phd", "b.s", "m.s", "b.a", "m.a", "degree", "university", "college", "institute"]):
                education_items.append({
                    "degree": line,
                    "institution": "University / Institution",
                    "year": next((m.group(0) for m in re.finditer(r'\b(19|20)\d{2}\b', line)), "Completed")
                })
        if not education_items and classified_sections["education"]:
            education_items.append({
                "degree": " ".join(classified_sections["education"][:2]),
                "institution": "Academic Institution",
                "year": "Documented"
            })

        return {
            "contact": contact_info,
            "summary": "\n".join(classified_sections["summary"]),
            "experience": experience_items,
            "education": education_items,
            "skills": detected_skills,
            "projects": classified_sections["projects"],
            "certifications": classified_sections["certifications"],
            "raw_text": raw_text
        }

