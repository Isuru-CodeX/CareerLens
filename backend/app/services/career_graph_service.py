"""
backend/app/services/career_graph_service.py - Multi-Profession Career Path Knowledge Graph & Skill Navigator Engine.
Models technical and non-technical roles, competencies, tools, and certifications across 6 major industries
as a Directed Knowledge Graph. Implements shortest-path career bridges (BFS / Dijkstra), skill dependency trees,
and candidate gap analysis.
"""
from typing import List, Dict, Any, Optional, Set
import heapq
from collections import deque

# Available Industries
INDUSTRIES = [
    {"id": "all", "name": "All Industries", "slug": "all", "icon": "Globe"},
    {"id": "tech", "name": "Technology & Software", "slug": "tech", "icon": "Code"},
    {"id": "healthcare", "name": "Healthcare & Medicine", "slug": "healthcare", "icon": "HeartPulse"},
    {"id": "finance", "name": "Finance & Banking", "slug": "finance", "icon": "Landmark"},
    {"id": "education", "name": "Education & Academia", "slug": "education", "icon": "GraduationCap"},
    {"id": "legal", "name": "Legal & Compliance", "slug": "legal", "icon": "Scale"},
    {"id": "marketing", "name": "Marketing & Creative", "slug": "marketing", "icon": "Megaphone"},
]

# Rich Taxonomy of Roles across 6 Major Industries
CAREER_ROLES: Dict[str, Dict[str, Any]] = {
    # -------------------------------------------------------------------------
    # 1. Technology & Software
    # -------------------------------------------------------------------------
    "junior_frontend": {
        "id": "junior_frontend",
        "title": "Junior Frontend Developer",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "Frontend",
        "level": 1,
        "level_label": "Entry Level (0-2 Yrs)",
        "salary_range": {"min": 65000, "median": 78000, "max": 92000},
        "description": "Builds responsive web interfaces, translates UI/UX designs into modular component code, and consumes RESTful APIs.",
        "core_skills": ["HTML5", "CSS3", "JavaScript", "React", "Git", "Tailwind CSS"],
        "advanced_skills": ["TypeScript", "Next.js", "Responsive Design"],
        "certifications": [],
        "bridges_to": [
            {"target": "mid_frontend", "difficulty": 2, "time_months": 14, "transition_label": "Domain Mastery"},
            {"target": "fullstack_dev", "difficulty": 3, "time_months": 18, "transition_label": "Backend Expansion"}
        ]
    },
    "mid_frontend": {
        "id": "mid_frontend",
        "title": "Frontend Software Engineer",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "Frontend",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 90000, "median": 115000, "max": 140000},
        "description": "Specializes in client architecture, Web Vitals performance optimization, state orchestration, and complex interactive SPAs.",
        "core_skills": ["TypeScript", "React", "Next.js", "State Management (Redux/Zustand)", "REST APIs", "Jest/Testing Library"],
        "advanced_skills": ["GraphQL", "Web Workers", "WebSockets", "CI/CD"],
        "certifications": ["Meta Front-End Developer Professional"],
        "bridges_to": [
            {"target": "senior_frontend", "difficulty": 3, "time_months": 20, "transition_label": "Architecture & Leadership"},
            {"target": "fullstack_dev", "difficulty": 2, "time_months": 12, "transition_label": "Full Stack Transition"}
        ]
    },
    "senior_frontend": {
        "id": "senior_frontend",
        "title": "Senior Frontend Architect",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "Frontend",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 135000, "median": 165000, "max": 195000},
        "description": "Establishes enterprise design systems, micro-frontend modularity, build tooling pipelines, accessibility standards, and mentoring.",
        "core_skills": ["TypeScript", "Micro-Frontends", "Performance Auditing", "Design Systems", "WebAssembly", "CI/CD"],
        "advanced_skills": ["System Design", "Cloud Edge Rendering", "Security (CSP/OWASP)"],
        "certifications": ["AWS Certified Developer - Associate"],
        "bridges_to": [
            {"target": "lead_fullstack", "difficulty": 3, "time_months": 18, "transition_label": "Full-Stack System Leadership"},
            {"target": "engineering_mgr", "difficulty": 4, "time_months": 24, "transition_label": "Management Track"}
        ]
    },
    "fullstack_dev": {
        "id": "fullstack_dev",
        "title": "Full Stack Engineer",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "Full Stack",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 95000, "median": 125000, "max": 150000},
        "description": "Delivers end-to-end features spanning dynamic client interfaces, relational database modeling, and server-side API endpoints.",
        "core_skills": ["TypeScript", "React", "Node.js", "Python", "SQL (PostgreSQL)", "REST APIs", "Docker"],
        "advanced_skills": ["GraphQL", "Redis Caching", "ORM (SQLAlchemy/Prisma)", "Cloud Basics"],
        "certifications": ["AWS Certified Cloud Practitioner"],
        "bridges_to": [
            {"target": "senior_fullstack", "difficulty": 2, "time_months": 18, "transition_label": "Senior Engineering"},
            {"target": "backend_dev", "difficulty": 2, "time_months": 10, "transition_label": "Distributed Backend Specialization"},
            {"target": "devops_eng", "difficulty": 3, "time_months": 16, "transition_label": "Cloud & Infra Shift"}
        ]
    },
    "senior_fullstack": {
        "id": "senior_fullstack",
        "title": "Senior Full Stack Engineer",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "Full Stack",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 140000, "median": 175000, "max": 210000},
        "description": "Drives end-to-end multi-tier system scalability, asynchronous background queuing, database sharding, and cross-functional feature pods.",
        "core_skills": ["TypeScript", "Python/Go", "PostgreSQL", "Docker", "Kubernetes", "Redis", "Distributed System Design"],
        "advanced_skills": ["Event-Driven Architecture", "Kafka", "Observability (OpenTelemetry)", "Security"],
        "certifications": ["AWS Certified Solutions Architect - Associate"],
        "bridges_to": [
            {"target": "lead_fullstack", "difficulty": 3, "time_months": 18, "transition_label": "Staff / Principal Architect"},
            {"target": "cloud_architect", "difficulty": 3, "time_months": 20, "transition_label": "Enterprise Cloud Architecture"},
            {"target": "engineering_mgr", "difficulty": 4, "time_months": 24, "transition_label": "People Leadership"}
        ]
    },
    "lead_fullstack": {
        "id": "lead_fullstack",
        "title": "Lead Full Stack Architect / Staff Engineer",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "Full Stack",
        "level": 4,
        "level_label": "Staff / Lead (8+ Yrs)",
        "salary_range": {"min": 185000, "median": 225000, "max": 280000},
        "description": "Guides organization-wide technical direction, evaluates tech stacks, defines zero-downtime deployment patterns, and unblocks engineering teams.",
        "core_skills": ["High-Availability Distributed Systems", "Kubernetes", "Event Streaming", "Multi-Cloud Strategy", "Architecture Review"],
        "advanced_skills": ["Disaster Recovery Strategy", "Cost Engineering (FinOps)", "Executive Alignment"],
        "certifications": ["AWS Certified Solutions Architect - Professional"],
        "bridges_to": [
            {"target": "cloud_architect", "difficulty": 2, "time_months": 12, "transition_label": "Principal Cloud Strategist"},
            {"target": "engineering_mgr", "difficulty": 3, "time_months": 18, "transition_label": "VP of Engineering Track"}
        ]
    },
    "backend_dev": {
        "id": "backend_dev",
        "title": "Backend Software Engineer",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "Backend",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 98000, "median": 128000, "max": 155000},
        "description": "Focuses on robust server logic, transaction guarantees, high-throughput database queries, and microservice APIs.",
        "core_skills": ["Python", "FastAPI", "Go/Java", "PostgreSQL", "Docker", "Redis", "REST & gRPC"],
        "advanced_skills": ["RabbitMQ/Kafka", "Database Index Tuning", "Concurrent Programming"],
        "certifications": ["AWS Certified Developer"],
        "bridges_to": [
            {"target": "senior_backend", "difficulty": 3, "time_months": 18, "transition_label": "Distributed Systems Depth"},
            {"target": "data_engineer", "difficulty": 3, "time_months": 14, "transition_label": "Data Platform Bridge"},
            {"target": "devops_eng", "difficulty": 2, "time_months": 12, "transition_label": "Platform Infrastructure"}
        ]
    },
    "senior_backend": {
        "id": "senior_backend",
        "title": "Senior Distributed Systems Engineer",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "Backend",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 145000, "median": 182000, "max": 225000},
        "description": "Architects resilient, fault-tolerant backends capable of millions of transactions, consensus algorithms, partition management, and data consistency.",
        "core_skills": ["Distributed Consensus (Raft/Paxos)", "Kafka/Pulsar", "Golang/Rust/Java", "PostgreSQL/Cassandra", "gRPC", "Kubernetes"],
        "advanced_skills": ["Chaos Engineering", "Zero-Copy Networking", "Low-Latency Optimization"],
        "certifications": ["Certified Kubernetes Application Developer (CKAD)"],
        "bridges_to": [
            {"target": "cloud_architect", "difficulty": 3, "time_months": 18, "transition_label": "Cloud Architecture"},
            {"target": "engineering_mgr", "difficulty": 3, "time_months": 20, "transition_label": "Engineering Management"}
        ]
    },
    "devops_eng": {
        "id": "devops_eng",
        "title": "DevOps & Cloud Platform Engineer",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "DevOps & Cloud",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 105000, "median": 135000, "max": 165000},
        "description": "Automates cloud environments, maintains CI/CD delivery pipelines, manages container clusters, and enforces infrastructure-as-code.",
        "core_skills": ["Docker", "Kubernetes", "Terraform", "AWS/GCP", "CI/CD (GitHub Actions/GitLab)", "Linux Internals"],
        "advanced_skills": ["Prometheus/Grafana", "Helm", "Security Hardening", "Bash/Python Scripting"],
        "certifications": ["HashiCorp Certified: Terraform Associate", "AWS Solutions Architect - Associate"],
        "bridges_to": [
            {"target": "cloud_architect", "difficulty": 3, "time_months": 20, "transition_label": "Enterprise Cloud Architecture"}
        ]
    },
    "cloud_architect": {
        "id": "cloud_architect",
        "title": "Principal Cloud Solutions Architect",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "DevOps & Cloud",
        "level": 4,
        "level_label": "Staff / Architect (8+ Yrs)",
        "salary_range": {"min": 190000, "median": 235000, "max": 295000},
        "description": "Designs multi-region cloud governance, hybrid connectivity, cloud FinOps cost optimization, and SOC2/HIPAA landing zones.",
        "core_skills": ["Multi-Cloud Architecture (AWS/Azure/GCP)", "Kubernetes (EKS/GKE)", "Terraform Enterprise", "Cloud Security", "FinOps", "Disaster Recovery"],
        "advanced_skills": ["Zero Trust Mesh (Istio)", "Global Transit Gateways", "SLA Modeling"],
        "certifications": ["AWS Certified Solutions Architect - Professional", "Google Cloud Professional Cloud Architect"],
        "bridges_to": [
            {"target": "engineering_mgr", "difficulty": 2, "time_months": 14, "transition_label": "Executive Leadership"}
        ]
    },
    "data_analyst": {
        "id": "data_analyst",
        "title": "Data Analyst & Business Intelligence Specialist",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "Data & AI",
        "level": 1,
        "level_label": "Entry Level (0-2 Yrs)",
        "salary_range": {"min": 70000, "median": 85000, "max": 102000},
        "description": "Extracts exploratory insights, builds actionable BI dashboards, authors complex SQL transformations, and models business KPIs.",
        "core_skills": ["SQL", "Python (Pandas/NumPy)", "Tableau / PowerBI", "Statistical Analysis", "Data Cleansing", "Git"],
        "advanced_skills": ["A/B Testing Frameworks", "ETL Concepts", "BigQuery / Snowflake"],
        "certifications": ["Google Data Analytics Professional Certificate"],
        "bridges_to": [
            {"target": "data_engineer", "difficulty": 3, "time_months": 16, "transition_label": "Data Engineering Track"},
            {"target": "ml_engineer", "difficulty": 4, "time_months": 22, "transition_label": "Machine Learning Transition"}
        ]
    },
    "data_engineer": {
        "id": "data_engineer",
        "title": "Data Platform Engineer",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "Data & AI",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 105000, "median": 138000, "max": 170000},
        "description": "Constructs robust, petabyte-scale data pipelines, streaming ingestion, lakehouse architectures, and dimensional modeling.",
        "core_skills": ["Python", "SQL", "Apache Spark", "Airflow / dbt", "Kafka", "Data Lakehouse (Delta/Iceberg)", "Cloud Warehousing"],
        "advanced_skills": ["Distributed Query Optimization", "Data Mesh Governance", "Flink Streaming"],
        "certifications": ["Databricks Certified Data Engineer Associate", "Google Cloud Professional Data Engineer"],
        "bridges_to": [
            {"target": "ml_engineer", "difficulty": 3, "time_months": 16, "transition_label": "MLOps & Feature Store Bridge"}
        ]
    },
    "ml_engineer": {
        "id": "ml_engineer",
        "title": "Machine Learning Engineer / MLOps Specialist",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "Data & AI",
        "level": 3,
        "level_label": "Senior (4-7 Yrs)",
        "salary_range": {"min": 145000, "median": 185000, "max": 235000},
        "description": "Transitions research models into production inference microservices, feature store pipelines, continuous model evaluation, and GPU scaling.",
        "core_skills": ["Python", "PyTorch / TensorFlow", "MLflow / Kubeflow", "Docker / Triton Inference", "Vector Databases", "FastAPI"],
        "advanced_skills": ["LLM Fine-Tuning (LoRA)", "RAG Architecture", "Distributed Model Parallelism"],
        "certifications": ["AWS Certified Machine Learning - Specialty"],
        "bridges_to": [
            {"target": "lead_fullstack", "difficulty": 3, "time_months": 18, "transition_label": "Full-Stack AI Application Lead"}
        ]
    },
    "cybersecurity_eng": {
        "id": "cybersecurity_eng",
        "title": "Cybersecurity & AppSec Engineer",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "Security",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 95000, "median": 125000, "max": 150000},
        "description": "Audits application vulnerability postures, conducts automated SAST/DAST scans, enforces zero trust identity, and triages threat vectors.",
        "core_skills": ["OWASP Top 10", "Network Security", "Vulnerability Assessment", "OAuth2 / OIDC", "Linux Security", "Python Scripting"],
        "advanced_skills": ["Penetration Testing", "Threat Modeling", "SIEM Tools"],
        "certifications": ["CompTIA Security+", "Certified Ethical Hacker (CEH)"],
        "bridges_to": [
            {"target": "engineering_mgr", "difficulty": 3, "time_months": 20, "transition_label": "Security Leadership"}
        ]
    },
    "engineering_mgr": {
        "id": "engineering_mgr",
        "title": "Engineering Manager / Director",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "Management",
        "level": 4,
        "level_label": "Leadership (8+ Yrs)",
        "salary_range": {"min": 180000, "median": 230000, "max": 290000},
        "description": "Oversees high-performing engineering squads, quarterly roadmaps, budget allocation, hiring strategy, career development, and delivery velocity.",
        "core_skills": ["Team Leadership", "Agile / Scrum / Kanban", "Engineering Metrics (DORA)", "System Architecture Oversight", "Hiring & Mentorship"],
        "advanced_skills": ["Cross-Functional Alignment", "Budget Management", "Conflict Mediation"],
        "certifications": ["Certified ScrumMaster (CSM)", "PMP"],
        "bridges_to": []
    },

    # -------------------------------------------------------------------------
    # 2. Healthcare & Medicine
    # -------------------------------------------------------------------------
    "cna_nurse_aide": {
        "id": "cna_nurse_aide",
        "title": "Certified Nursing Assistant (CNA)",
        "industry_id": "healthcare",
        "industry_name": "Healthcare & Medicine",
        "category": "Patient Care",
        "level": 1,
        "level_label": "Entry Level (0-2 Yrs)",
        "salary_range": {"min": 32000, "median": 38000, "max": 46000},
        "description": "Provides essential bedside patient assistance, monitors and logs vital signs, and maintains sterile patient care environments.",
        "core_skills": ["Patient Care & Vitals", "Infection Control", "ADL Assistance", "EMR Documentation", "CPR / BLS", "Medical Terminology"],
        "advanced_skills": ["Phlebotomy Basics", "Wound Observation", "Patient Mobility Assistance"],
        "certifications": ["State CNA License", "BLS / CPR Certification (AHA)"],
        "bridges_to": [
            {"target": "lpn_practical_nurse", "difficulty": 2, "time_months": 12, "transition_label": "Practical Nursing Program"}
        ]
    },
    "lpn_practical_nurse": {
        "id": "lpn_practical_nurse",
        "title": "Licensed Practical Nurse (LPN)",
        "industry_id": "healthcare",
        "industry_name": "Healthcare & Medicine",
        "category": "Clinical Nursing",
        "level": 2,
        "level_label": "Mid Level (1-4 Yrs)",
        "salary_range": {"min": 46000, "median": 54000, "max": 65000},
        "description": "Administers prescribed medications, performs sterile dressings, evaluates patient status changes, and coordinates outpatient plans.",
        "core_skills": ["Medication Administration", "Wound Care", "Patient Assessment", "IV Therapy Protocols", "Clinical Protocols", "EPIC EMR Systems"],
        "advanced_skills": ["Geriatric Care Coordination", "Care Plan Development", "Patient Family Education"],
        "certifications": ["LPN License (NCLEX-PN)", "IV Therapy Certification"],
        "bridges_to": [
            {"target": "registered_nurse", "difficulty": 3, "time_months": 18, "transition_label": "LPN-to-RN Degree Bridge"}
        ]
    },
    "registered_nurse": {
        "id": "registered_nurse",
        "title": "Registered Nurse (Staff RN)",
        "industry_id": "healthcare",
        "industry_name": "Healthcare & Medicine",
        "category": "Clinical Nursing",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 72000, "median": 86000, "max": 105000},
        "description": "Directs acute bedside patient care, conducts triage evaluations, administers IV pharmacology, and collaborates across interdisciplinary medical teams.",
        "core_skills": ["Acute Care Management", "Patient Triage", "Pharmacology & IV Infusions", "Critical Thinking", "Interdisciplinary Care", "HIPAA Compliance"],
        "advanced_skills": ["Telemetry Monitoring", "Critical Care Protocols", "Preceptorship & Staff Training"],
        "certifications": ["RN License (NCLEX-RN)", "ACLS (Advanced Cardiac Life Support)"],
        "bridges_to": [
            {"target": "charge_nurse", "difficulty": 2, "time_months": 16, "transition_label": "Unit Leadership & Triage Lead"},
            {"target": "clinical_nurse_spec", "difficulty": 3, "time_months": 22, "transition_label": "Clinical Nurse Specialization"}
        ]
    },
    "charge_nurse": {
        "id": "charge_nurse",
        "title": "Charge Nurse / Unit Supervisor",
        "industry_id": "healthcare",
        "industry_name": "Healthcare & Medicine",
        "category": "Nursing Leadership",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 92000, "median": 108000, "max": 128000},
        "description": "Supervises hospital floor nursing operations, bed allocations, acute clinical escalations, quality compliance, and staff shift assignments.",
        "core_skills": ["Unit Resource Scheduling", "Clinical Escalations", "Crisis Intervention", "Staff Mentorship", "Quality Improvement", "Patient Flow Optimization"],
        "advanced_skills": ["Budgetary Variance Monitoring", "Sentinel Event Reporting", "Regulatory Readiness"],
        "certifications": ["Certified Nurse Manager & Leader (CNML)", "PALS Certification"],
        "bridges_to": [
            {"target": "nurse_practitioner", "difficulty": 3, "time_months": 24, "transition_label": "Master's APRN Track"},
            {"target": "hospital_ops_director", "difficulty": 3, "time_months": 24, "transition_label": "Hospital Administration"}
        ]
    },
    "clinical_nurse_spec": {
        "id": "clinical_nurse_spec",
        "title": "Clinical Nurse Specialist (CNS)",
        "industry_id": "healthcare",
        "industry_name": "Healthcare & Medicine",
        "category": "Advanced Practice",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 100000, "median": 118000, "max": 142000},
        "description": "Drives evidence-based clinical practice standards across hospital departments, leads quality improvement initiatives, and consults on complex cases.",
        "core_skills": ["Evidence-Based Clinical Practice", "Advanced Pathophysiology", "Clinical Research Protocols", "Staff Education", "Clinical Outcomes Analysis"],
        "advanced_skills": ["Infection Control Epidemiology", "Health Informatics Integration"],
        "certifications": ["CNS Board Certification (ANCC)"],
        "bridges_to": [
            {"target": "nurse_practitioner", "difficulty": 2, "time_months": 14, "transition_label": "Direct Primary/Acute Care Credential"}
        ]
    },
    "nurse_practitioner": {
        "id": "nurse_practitioner",
        "title": "Family / Acute Care Nurse Practitioner (NP)",
        "industry_id": "healthcare",
        "industry_name": "Healthcare & Medicine",
        "category": "Advanced Practice",
        "level": 4,
        "level_label": "Staff / Advanced Practice (7+ Yrs)",
        "salary_range": {"min": 115000, "median": 135000, "max": 165000},
        "description": "Autonomously diagnoses medical conditions, orders and interprets diagnostic tests, prescribes pharmaceutical therapies, and manages patient care plans.",
        "core_skills": ["Clinical Diagnosis", "Prescriptive Authority", "Patient Management", "Diagnostic Interpretation", "Preventive Care", "Chronic Disease Management"],
        "advanced_skills": ["Minor Office Procedures", "Hospital Rounds", "Specialist Referrals"],
        "certifications": ["FNP-C / AGNP Board Certification (AANP / ANCC)", "DEA Registration"],
        "bridges_to": [
            {"target": "hospital_ops_director", "difficulty": 2, "time_months": 18, "transition_label": "Executive Clinical Leadership"}
        ]
    },
    "hospital_ops_director": {
        "id": "hospital_ops_director",
        "title": "Hospital Clinical & Operations Director",
        "industry_id": "healthcare",
        "industry_name": "Healthcare & Medicine",
        "category": "Hospital Executive",
        "level": 4,
        "level_label": "Executive (8+ Yrs)",
        "salary_range": {"min": 150000, "median": 185000, "max": 235000},
        "description": "Administers acute hospital operations, multimillion-dollar clinical budgets, Joint Commission accreditations, provider retention, and clinical quality.",
        "core_skills": ["Healthcare Systems Administration", "Joint Commission Compliance", "Clinical Budgeting ($10M+)", "Provider Staffing", "Patient Safety Standards", "Health Informatics"],
        "advanced_skills": ["Hospital P&L Oversight", "Union Negotiation", "Community Health Strategy"],
        "certifications": ["FACHE (Fellow of the American College of Healthcare Executives)", "CPHQ"],
        "bridges_to": []
    },

    # -------------------------------------------------------------------------
    # 3. Finance & Banking
    # -------------------------------------------------------------------------
    "junior_fin_analyst": {
        "id": "junior_fin_analyst",
        "title": "Junior Financial Analyst",
        "industry_id": "finance",
        "industry_name": "Finance & Banking",
        "category": "Corporate Finance",
        "level": 1,
        "level_label": "Entry Level (0-2 Yrs)",
        "salary_range": {"min": 58000, "median": 68000, "max": 82000},
        "description": "Constructs financial models, analyzes operating variance against forecasts, audits corporate budget line items, and synthesizes quarterly report decks.",
        "core_skills": ["Financial Modeling", "Excel (VLOOKUP/XLOOKUP/Index-Match)", "Variance Analysis", "Financial Statements (P&L/Balance Sheet)", "PowerBI", "SQL"],
        "advanced_skills": ["Python for Finance", "ERP Reporting (SAP/Oracle)", "Data Cleansing"],
        "certifications": ["Bloomberg Market Concepts (BMC)", "CFA Level I Candidate"],
        "bridges_to": [
            {"target": "senior_fin_analyst", "difficulty": 2, "time_months": 18, "transition_label": "FP&A Specialization"},
            {"target": "corporate_accountant", "difficulty": 2, "time_months": 12, "transition_label": "General Ledger Accounting Shift"}
        ]
    },
    "corporate_accountant": {
        "id": "corporate_accountant",
        "title": "Senior Corporate Accountant",
        "industry_id": "finance",
        "industry_name": "Finance & Banking",
        "category": "Accounting",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 75000, "median": 88000, "max": 108000},
        "description": "Executes month-end financial closes, prepares general ledger reconciliations, ensures GAAP compliance, and facilitates external audit engagements.",
        "core_skills": ["GAAP Accounting", "Month-End Close", "General Ledger", "Tax Compliance", "ERP Systems (NetSuite/SAP)", "Audit Preparation"],
        "advanced_skills": ["Revenue Recognition (ASC 606)", "Fixed Asset Accounting", "SOX 404 Controls"],
        "certifications": ["CPA (Certified Public Accountant)"],
        "bridges_to": [
            {"target": "senior_fin_analyst", "difficulty": 2, "time_months": 14, "transition_label": "Strategic Finance Bridge"},
            {"target": "cfo_finance_director", "difficulty": 4, "time_months": 36, "transition_label": "Controller to CFO Track"}
        ]
    },
    "senior_fin_analyst": {
        "id": "senior_fin_analyst",
        "title": "Senior FP&A Finance Analyst",
        "industry_id": "finance",
        "industry_name": "Finance & Banking",
        "category": "Corporate Finance",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 95000, "median": 115000, "max": 140000},
        "description": "Leads annual operating plan (AOP) budgeting, dynamic discounted cash flow (DCF) models, scenario analyses, and executive board presentations.",
        "core_skills": ["Corporate FP&A", "Discounted Cash Flow (DCF)", "Budget Forecasting", "Scenario Modeling", "Executive Presentations", "SQL / Tableau"],
        "advanced_skills": ["Capital Expenditure ROI Modeling", "M&A Due Diligence Support", "Strategic Headcount Planning"],
        "certifications": ["CFA Charterholder", "FPAC (Certified Corporate FP&A Professional)"],
        "bridges_to": [
            {"target": "investment_associate", "difficulty": 3, "time_months": 18, "transition_label": "Private Equity / Investment Banking"},
            {"target": "cfo_finance_director", "difficulty": 3, "time_months": 24, "transition_label": "VP of Finance / CFO Track"}
        ]
    },
    "investment_associate": {
        "id": "investment_associate",
        "title": "Private Equity / Investment Banking Associate",
        "industry_id": "finance",
        "industry_name": "Finance & Banking",
        "category": "Investment Banking",
        "level": 3,
        "level_label": "Senior (4-7 Yrs)",
        "salary_range": {"min": 120000, "median": 145000, "max": 185000},
        "description": "Conducts intensive transaction underwriting, leveraged buyout (LBO) modeling, commercial due diligence, and capital structure advisory.",
        "core_skills": ["LBO Modeling", "Mergers & Acquisitions (M&A)", "Due Diligence", "Capital Structure", "Pitch Books", "Valuation Methodologies"],
        "advanced_skills": ["Debt Covenant Structuring", "Portfolio Company Governance", "Exit Valuation"],
        "certifications": ["FINRA Series 7 & 79", "CFA Charter"],
        "bridges_to": [
            {"target": "cfo_finance_director", "difficulty": 3, "time_months": 20, "transition_label": "Corporate Executive CFO"}
        ]
    },
    "cfo_finance_director": {
        "id": "cfo_finance_director",
        "title": "Chief Financial Officer (CFO) / VP of Finance",
        "industry_id": "finance",
        "industry_name": "Finance & Banking",
        "category": "Executive Finance",
        "level": 4,
        "level_label": "Executive (8+ Yrs)",
        "salary_range": {"min": 190000, "median": 240000, "max": 320000},
        "description": "Steers overall corporate capital allocation, debt/equity financing rounds, investor relations, SEC filings, tax planning, and board fiduciary oversight.",
        "core_skills": ["Capital Allocation & Debt Financing", "Board Governance", "Strategic Planning", "Treasury Management", "Audit & Internal Controls", "Investor Relations"],
        "advanced_skills": ["IPO Execution", "Enterprise M&A Integration", "Macroeconomic Hedging Strategy"],
        "certifications": ["CPA / MBA in Finance"],
        "bridges_to": []
    },

    # -------------------------------------------------------------------------
    # 4. Education & Academia
    # -------------------------------------------------------------------------
    "teaching_assistant": {
        "id": "teaching_assistant",
        "title": "Teaching Assistant / Paraeducator",
        "industry_id": "education",
        "industry_name": "Education & Academia",
        "category": "Instructional Support",
        "level": 1,
        "level_label": "Entry Level (0-2 Yrs)",
        "salary_range": {"min": 30000, "median": 36000, "max": 45000},
        "description": "Assists classroom teachers with instructional delivery, supports individualized education programs (IEPs), and manages small student groups.",
        "core_skills": ["Classroom Support", "Individualized Education Plans (IEP)", "Student Engagement", "Behavior Support", "Educational Technology", "Lesson Prep"],
        "advanced_skills": ["Differentiated Group Instruction", "Assistive Tech Tools", "Formative Observation"],
        "certifications": ["Paraeducator State Credential"],
        "bridges_to": [
            {"target": "secondary_teacher", "difficulty": 2, "time_months": 16, "transition_label": "Teacher Credential Program"}
        ]
    },
    "secondary_teacher": {
        "id": "secondary_teacher",
        "title": "Secondary Subject Educator",
        "industry_id": "education",
        "industry_name": "Education & Academia",
        "category": "Classroom Instruction",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 52000, "median": 66000, "max": 84000},
        "description": "Designs curriculum units, facilitates rigorous subject instruction, conducts ongoing formative assessments, and partners with student families.",
        "core_skills": ["Curriculum Delivery", "Formative Assessment", "Pedagogy & Classroom Management", "Parent-Teacher Communications", "Differentiated Instruction", "LMS (Google Classroom/Canvas)"],
        "advanced_skills": ["Standardized Testing Analysis", "Project-Based Learning", "Peer Mentorship"],
        "certifications": ["State Teaching Credential / License"],
        "bridges_to": [
            {"target": "instructional_designer", "difficulty": 2, "time_months": 14, "transition_label": "E-Learning & Curriculum Design"},
            {"target": "dept_head_teacher", "difficulty": 2, "time_months": 18, "transition_label": "Department Chair Promotion"}
        ]
    },
    "instructional_designer": {
        "id": "instructional_designer",
        "title": "Instructional Designer & E-Learning Architect",
        "industry_id": "education",
        "industry_name": "Education & Academia",
        "category": "Educational Technology",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 72000, "median": 88000, "max": 110000},
        "description": "Applies adult learning theory and instructional design frameworks (ADDIE/SAM) to build interactive digital courseware and enterprise training.",
        "core_skills": ["ADDIE / SAM Models", "Articulate Storyline", "LMS Administration (Canvas/Moodle)", "Adult Learning Theory", "Micro-Learning Architecture", "Video Storyboarding"],
        "advanced_skills": ["SCORM/xAPI Standards", "Learning Analytics", "Interactive Gamification"],
        "certifications": ["ATD Master Instructional Designer Certification"],
        "bridges_to": [
            {"target": "academic_dean", "difficulty": 3, "time_months": 24, "transition_label": "Dean of Academic Technology"}
        ]
    },
    "dept_head_teacher": {
        "id": "dept_head_teacher",
        "title": "Instructional Lead & Department Chair",
        "industry_id": "education",
        "industry_name": "Education & Academia",
        "category": "Academic Leadership",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 76000, "median": 92000, "max": 115000},
        "description": "Leads subject faculty, audits pedagogical alignment with state educational standards, conducts teacher peer coaching, and manages departmental budgets.",
        "core_skills": ["Curriculum Standards Alignment", "Faculty Observation & Coaching", "Departmental Budgeting", "Standardized Testing Analysis", "Professional Learning Communities (PLC)", "Pedagogical Leadership"],
        "advanced_skills": ["Grant Writing", "District Curriculum Committees", "Accreditation Self-Studies"],
        "certifications": ["National Board for Professional Teaching Standards (NBPTS)"],
        "bridges_to": [
            {"target": "academic_dean", "difficulty": 3, "time_months": 20, "transition_label": "Administrative Credential to Principal"}
        ]
    },
    "academic_dean": {
        "id": "academic_dean",
        "title": "Academic Dean / School Principal",
        "industry_id": "education",
        "industry_name": "Education & Academia",
        "category": "Academic Administration",
        "level": 4,
        "level_label": "Executive (8+ Yrs)",
        "salary_range": {"min": 115000, "median": 142000, "max": 180000},
        "description": "Provides overarching institutional leadership, oversees accreditation compliance, faculty tenure/recruitment, institutional budgets, and student achievement.",
        "core_skills": ["Educational Institution Leadership", "Accreditation & State Compliance", "Faculty Recruitment & Retention", "Community Partnerships", "Strategic School Improvement", "School Budgeting ($5M+)"],
        "advanced_skills": ["Crisis Management", "Donor Development", "Policy Reform Advisory"],
        "certifications": ["Administrative Services Credential / Ed.D. or Ph.D."],
        "bridges_to": []
    },

    # -------------------------------------------------------------------------
    # 5. Legal & Compliance
    # -------------------------------------------------------------------------
    "corporate_paralegal": {
        "id": "corporate_paralegal",
        "title": "Corporate Paralegal",
        "industry_id": "legal",
        "industry_name": "Legal & Compliance",
        "category": "Legal Operations",
        "level": 1,
        "level_label": "Entry Level (0-2 Yrs)",
        "salary_range": {"min": 48000, "median": 58000, "max": 72000},
        "description": "Conducts statutory legal research, drafts boilerplate transactional contracts, coordinates discovery materials, and manages electronic docket filings.",
        "core_skills": ["Legal Research (Westlaw/LexisNexis)", "Contract Review", "Discovery Coordination", "Brief Drafting", "Document Filing", "Ethics & Confidentiality"],
        "advanced_skills": ["Bluebook Citations", "SEC EDGAR Filings", "Entity Formation Filings"],
        "certifications": ["Certified Paralegal (CP) - NALA"],
        "bridges_to": [
            {"target": "compliance_specialist", "difficulty": 2, "time_months": 14, "transition_label": "Regulatory Compliance Shift"},
            {"target": "associate_attorney", "difficulty": 4, "time_months": 36, "transition_label": "Law School & Bar Admission"}
        ]
    },
    "compliance_specialist": {
        "id": "compliance_specialist",
        "title": "Regulatory Compliance Specialist",
        "industry_id": "legal",
        "industry_name": "Legal & Compliance",
        "category": "Regulatory Compliance",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 70000, "median": 85000, "max": 105000},
        "description": "Audits corporate adherence to statutory guidelines (AML, KYC, GDPR, HIPAA, FCPA), coordinates regulatory audits, and manages internal whistleblower reports.",
        "core_skills": ["Regulatory Frameworks (AML/KYC/GDPR)", "Risk Assessments", "Policy Auditing", "Internal Investigation", "Compliance Training", "Whistleblower Protocols"],
        "advanced_skills": ["Sanctions Screening", "Enterprise Risk Registers", "Vendor Due Diligence"],
        "certifications": ["Certified Compliance & Ethics Professional (CCEP)", "ACAMS"],
        "bridges_to": [
            {"target": "senior_counsel", "difficulty": 3, "time_months": 22, "transition_label": "Head of Regulatory & Compliance Track"}
        ]
    },
    "associate_attorney": {
        "id": "associate_attorney",
        "title": "Associate Corporate Attorney",
        "industry_id": "legal",
        "industry_name": "Legal & Compliance",
        "category": "Corporate Law",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 110000, "median": 135000, "max": 175000},
        "description": "Drafts complex commercial agreements, conducts deal diligence for mergers and acquisitions, advises business leaders on risk liability, and negotiates terms.",
        "core_skills": ["Commercial Transactions", "Litigation Defense", "Statutory Interpretation", "Negotiation Strategy", "Client Advocacy", "Due Diligence"],
        "advanced_skills": ["Cross-Border Joint Ventures", "Employment Law Counseling", "Licensing Agreements"],
        "certifications": ["State Bar License (Juris Doctor)"],
        "bridges_to": [
            {"target": "senior_counsel", "difficulty": 2, "time_months": 20, "transition_label": "Senior In-House Counsel Promotion"}
        ]
    },
    "senior_counsel": {
        "id": "senior_counsel",
        "title": "Senior Corporate Counsel",
        "industry_id": "legal",
        "industry_name": "Legal & Compliance",
        "category": "Corporate Law",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 155000, "median": 185000, "max": 235000},
        "description": "Leads commercial deal structuring, manages outside counsel litigation budgets, protects global intellectual property, and negotiates strategic enterprise contracts.",
        "core_skills": ["Enterprise Risk Management", "Complex M&A Contracts", "Intellectual Property Protection", "Regulatory Enforcement Defense", "Outside Counsel Management", "Executive Risk Advisory"],
        "advanced_skills": ["Antitrust Counseling", "SEC Disclosure Oversight", "Crisis Communications Legal Defense"],
        "certifications": ["State Bar License", "CIPP/US (Certified Information Privacy Professional)"],
        "bridges_to": [
            {"target": "chief_legal_officer", "difficulty": 3, "time_months": 22, "transition_label": "General Counsel / CLO Track"}
        ]
    },
    "chief_legal_officer": {
        "id": "chief_legal_officer",
        "title": "General Counsel / Chief Legal Officer",
        "industry_id": "legal",
        "industry_name": "Legal & Compliance",
        "category": "Executive Legal",
        "level": 4,
        "level_label": "Executive (8+ Yrs)",
        "salary_range": {"min": 210000, "median": 265000, "max": 360000},
        "description": "Serves as chief legal advisor to the CEO and Board of Directors, oversees all enterprise legal, compliance, governance, and regulatory portfolios.",
        "core_skills": ["Executive Board Advisory", "Corporate Governance", "Litigation Portfolio Oversight", "Securities & SEC Filings", "Global Trade Compliance", "Enterprise M&A Strategy"],
        "advanced_skills": ["Crisis Response Leadership", "Shareholder Activism Defense", "Congressional / Regulatory Inquiries"],
        "certifications": ["Active State Bar License"],
        "bridges_to": []
    },

    # -------------------------------------------------------------------------
    # 6. Marketing & Creative
    # -------------------------------------------------------------------------
    "junior_content_specialist": {
        "id": "junior_content_specialist",
        "title": "Content & Digital Marketing Specialist",
        "industry_id": "marketing",
        "industry_name": "Marketing & Creative",
        "category": "Content & Social",
        "level": 1,
        "level_label": "Entry Level (0-2 Yrs)",
        "salary_range": {"min": 44000, "median": 54000, "max": 66000},
        "description": "Authors engaging editorial content, coordinates social media editorial calendars, optimizes copy for organic SEO, and executes email drip campaigns.",
        "core_skills": ["Copywriting", "SEO Optimization", "Social Media Management", "Email Marketing (HubSpot)", "Canva / Adobe Creative Suite", "Google Analytics 4"],
        "advanced_skills": ["CMS Management (WordPress/Webflow)", "Short-Form Video Production", "A/B Subject Line Testing"],
        "certifications": ["HubSpot Content Marketing Certification", "Google Analytics Individual Qualification"],
        "bridges_to": [
            {"target": "growth_marketer", "difficulty": 2, "time_months": 14, "transition_label": "Performance Marketing Shift"},
            {"target": "product_designer", "difficulty": 3, "time_months": 18, "transition_label": "UX/UI Design Pivot"}
        ]
    },
    "growth_marketer": {
        "id": "growth_marketer",
        "title": "Performance Marketing & Growth Specialist",
        "industry_id": "marketing",
        "industry_name": "Marketing & Creative",
        "category": "Growth Marketing",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 72000, "median": 88000, "max": 112000},
        "description": "Manages paid acquisition channels (Google Ads, Meta, LinkedIn), models customer acquisition cost (CAC) and LTV, and optimizes funnel conversion rates.",
        "core_skills": ["Paid Acquisition (Meta/Google Ads)", "Conversion Rate Optimization (CRO)", "A/B Testing", "Customer Acquisition Cost (CAC) Optimization", "Attribution Modeling", "SQL / Excel Analytics"],
        "advanced_skills": ["Programmatic Media Buying", "Retention Funnel Marketing", "Looker / Tableau Dashboards"],
        "certifications": ["Meta Certified Media Buying Professional", "Google Ads Search Certification"],
        "bridges_to": [
            {"target": "marketing_director", "difficulty": 3, "time_months": 20, "transition_label": "Integrated Marketing Leadership"}
        ]
    },
    "product_designer": {
        "id": "product_designer",
        "title": "Senior UX/UI Product Designer",
        "industry_id": "marketing",
        "industry_name": "Marketing & Creative",
        "category": "Design & UX",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 98000, "median": 118000, "max": 145000},
        "description": "Conducts generative user research, crafts accessible component design systems in Figma, prototypes interactive workflows, and validates with usability tests.",
        "core_skills": ["Figma & Design Systems", "User Research & Usability Testing", "Wireframing & Prototyping", "Information Architecture", "Design-to-Code Handoff", "Design Thinking"],
        "advanced_skills": ["Motion Design / Micro-Interactions", "Design Token Architecture", "Accessibility (WCAG 2.1)"],
        "certifications": ["Nielsen Norman Group UX Master Certification"],
        "bridges_to": [
            {"target": "marketing_director", "difficulty": 3, "time_months": 22, "transition_label": "Creative Direction Track"}
        ]
    },
    "marketing_director": {
        "id": "marketing_director",
        "title": "Director of Marketing & Brand Strategy",
        "industry_id": "marketing",
        "industry_name": "Marketing & Creative",
        "category": "Marketing Leadership",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 130000, "median": 155000, "max": 195000},
        "description": "Leads multichannel go-to-market strategies, directs agency partners, allocates multi-million dollar ad spend, and steers enterprise brand positioning.",
        "core_skills": ["Omnichannel Go-To-Market (GTM)", "Brand Positioning", "Marketing Budget Optimization ($2M+)", "Team Leadership", "Pipeline Generation", "PR & Analyst Relations"],
        "advanced_skills": ["Global Brand Restructuring", "Crisis Brand Management", "Revenue Operations (RevOps)"],
        "certifications": ["Reforge Growth Series Certificate"],
        "bridges_to": [
            {"target": "vp_marketing", "difficulty": 2, "time_months": 18, "transition_label": "Chief Marketing Officer Track"}
        ]
    },
    "vp_marketing": {
        "id": "vp_marketing",
        "title": "VP of Marketing / Chief Growth Officer",
        "industry_id": "marketing",
        "industry_name": "Marketing & Creative",
        "category": "Executive Marketing",
        "level": 4,
        "level_label": "Executive (8+ Yrs)",
        "salary_range": {"min": 180000, "median": 225000, "max": 290000},
        "description": "Spearheads company-wide demand generation, product marketing, public relations, customer lifecycle value, and board-level revenue growth targets.",
        "core_skills": ["Enterprise Growth Strategy", "Brand Equity Leadership", "Demand Generation Architecture", "Cross-Functional Revenue Alignment", "Executive Board Strategy", "Marketing P&L Ownership"],
        "advanced_skills": ["Category Creation Strategy", "Global Market Expansion", "Brand Valuation"],
        "certifications": ["Executive Leadership Certificate"],
        "bridges_to": []
    }
}

# Skill Dependencies & Synergy Trees across industries
SKILL_DEPENDENCY_GRAPH: Dict[str, List[str]] = {
    # Tech
    "Kubernetes": ["Docker", "Linux Internals", "Networking"],
    "Docker": ["Linux Internals"],
    "Next.js": ["React", "JavaScript", "TypeScript"],
    "TypeScript": ["JavaScript"],
    "React": ["JavaScript", "HTML5", "CSS3"],
    "PyTorch": ["Python", "Linear Algebra"],
    "TensorFlow": ["Python"],
    "RAG Architecture": ["Vector Databases", "Python", "FastAPI"],
    "Vector Databases": ["Python", "Information Retrieval"],
    "Kafka": ["Distributed Systems", "Java/Python"],
    "Terraform": ["Cloud Basics", "AWS/GCP"],
    "Micro-Frontends": ["TypeScript", "Module Federation", "Design Systems"],
    "Distributed Consensus (Raft/Paxos)": ["Distributed Systems", "Concurrent Programming"],

    # Healthcare
    "Medication Administration": ["Pharmacology & IV Infusions", "Medical Terminology"],
    "Clinical Diagnosis": ["Acute Care Management", "Advanced Pathophysiology", "Diagnostic Interpretation"],
    "Patient Triage": ["Patient Care & Vitals", "CPR / BLS"],
    "Prescriptive Authority": ["Clinical Diagnosis", "Pharmacology & IV Infusions"],
    "Healthcare Systems Administration": ["Unit Resource Scheduling", "Quality Improvement"],

    # Finance
    "Corporate FP&A": ["Financial Modeling", "Excel (VLOOKUP/XLOOKUP/Index-Match)", "Financial Statements (P&L/Balance Sheet)"],
    "Discounted Cash Flow (DCF)": ["Financial Modeling", "Corporate FP&A"],
    "LBO Modeling": ["Discounted Cash Flow (DCF)", "GAAP Accounting"],
    "Capital Allocation & Debt Financing": ["Corporate FP&A", "Capital Structure", "Board Governance"],

    # Education
    "Curriculum Delivery": ["Classroom Support", "Pedagogy & Classroom Management"],
    "Instructional Design": ["Curriculum Delivery", "Formative Assessment", "Adult Learning Theory"],
    "Educational Institution Leadership": ["Curriculum Standards Alignment", "Faculty Observation & Coaching", "School Budgeting"],

    # Legal
    "Commercial Transactions": ["Contract Review", "Legal Research (Westlaw/LexisNexis)"],
    "Regulatory Compliance": ["Risk Assessments", "Policy Auditing"],
    "Enterprise Risk Management": ["Commercial Transactions", "Regulatory Frameworks (AML/KYC/GDPR)"],
    "Executive Board Advisory": ["Enterprise Risk Management", "Corporate Governance"],

    # Marketing
    "Conversion Rate Optimization (CRO)": ["Copywriting", "A/B Testing", "Google Analytics 4"],
    "Omnichannel Go-To-Market (GTM)": ["Paid Acquisition (Meta/Google Ads)", "Brand Positioning", "Pipeline Generation"],
    "Enterprise Growth Strategy": ["Omnichannel Go-To-Market (GTM)", "Marketing Budget Optimization ($2M+)"]
}

SKILL_CATEGORIES: Dict[str, str] = {
    # Tech
    "React": "Frontend", "TypeScript": "Frontend", "Next.js": "Frontend", "HTML5": "Frontend", "CSS3": "Frontend", "Tailwind CSS": "Frontend", "Micro-Frontends": "Frontend", "Design Systems": "Frontend",
    "Node.js": "Backend", "Python": "Backend", "FastAPI": "Backend", "Go/Java": "Backend", "Golang/Rust/Java": "Backend", "PostgreSQL": "Backend", "Redis": "Backend", "REST APIs": "Backend", "gRPC": "Backend", "Distributed Systems": "Backend", "Kafka": "Backend",
    "Docker": "DevOps & Cloud", "Kubernetes": "DevOps & Cloud", "Terraform": "DevOps & Cloud", "AWS/GCP": "DevOps & Cloud", "CI/CD": "DevOps & Cloud", "Linux Internals": "DevOps & Cloud",
    "SQL": "Data & AI", "Apache Spark": "Data & AI", "Airflow / dbt": "Data & AI", "PyTorch": "Data & AI", "Vector Databases": "Data & AI", "RAG Architecture": "Data & AI",
    "OWASP Top 10": "Security", "Zero Trust Architecture": "Security",

    # Healthcare
    "Patient Care & Vitals": "Healthcare", "Infection Control": "Healthcare", "EMR Documentation": "Healthcare",
    "Acute Care Management": "Healthcare", "Pharmacology & IV Infusions": "Healthcare", "Clinical Diagnosis": "Healthcare",
    "Prescriptive Authority": "Healthcare", "Healthcare Systems Administration": "Healthcare",

    # Finance
    "Financial Modeling": "Finance", "GAAP Accounting": "Finance", "Month-End Close": "Finance",
    "Corporate FP&A": "Finance", "Discounted Cash Flow (DCF)": "Finance", "LBO Modeling": "Finance",
    "Capital Allocation & Debt Financing": "Finance",

    # Education
    "Classroom Support": "Education", "Individualized Education Plans (IEP)": "Education", "Curriculum Delivery": "Education",
    "ADDIE / SAM Models": "Education", "Educational Institution Leadership": "Education",

    # Legal
    "Legal Research (Westlaw/LexisNexis)": "Legal", "Contract Review": "Legal", "Regulatory Frameworks (AML/KYC/GDPR)": "Legal",
    "Commercial Transactions": "Legal", "Enterprise Risk Management": "Legal", "Corporate Governance": "Legal",

    # Marketing
    "Copywriting": "Marketing", "SEO Optimization": "Marketing", "Paid Acquisition (Meta/Google Ads)": "Marketing",
    "Conversion Rate Optimization (CRO)": "Marketing", "Figma & Design Systems": "Marketing", "Omnichannel Go-To-Market (GTM)": "Marketing"
}


class CareerGraphService:
    @classmethod
    def get_industries(cls) -> List[Dict[str, Any]]:
        """Returns all supported career industries."""
        return INDUSTRIES

    @classmethod
    def get_full_graph(cls, industry_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Returns nodes and edges filtered by selected industry (or all roles if 'all' or None).
        """
        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []
        target_industry = (industry_id or "all").lower().strip()

        # Filter roles
        selected_roles = {}
        for r_id, r in CAREER_ROLES.items():
            if target_industry in ("all", "") or r.get("industry_id") == target_industry:
                selected_roles[r_id] = r

        # Build node list
        for role_id, role in selected_roles.items():
            nodes.append({
                "id": role_id,
                "title": role["title"],
                "label": role["title"],
                "type": "role",
                "industry_id": role.get("industry_id", "tech"),
                "industry_name": role.get("industry_name", "Technology & Software"),
                "category": role["category"],
                "level": role["level"],
                "level_label": role["level_label"],
                "salary_median": role["salary_range"]["median"],
                "salary_range": role["salary_range"],
                "description": role["description"],
                "core_skills": role["core_skills"],
                "advanced_skills": role.get("advanced_skills", []),
                "certifications": role.get("certifications", [])
            })

            # Add edges for bridges within the selected pool
            for bridge in role.get("bridges_to", []):
                edges.append({
                    "id": f"bridge_{role_id}_{bridge['target']}",
                    "source": role_id,
                    "target": bridge["target"],
                    "type": "BRIDGES_TO",
                    "difficulty": bridge.get("difficulty", 2),
                    "time_months": bridge.get("time_months", 12),
                    "label": bridge.get("transition_label", "Career Progression")
                })

        # Distinct categories for the filtered subset
        categories = sorted(list({n["category"] for n in nodes}))

        return {
            "nodes": nodes,
            "edges": edges,
            "categories": categories,
            "industries": INDUSTRIES,
            "active_industry": target_industry
        }

    @classmethod
    def find_career_bridge(
        cls,
        current_role_id: str,
        target_role_id: str,
        candidate_skills: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Calculates optimal transition path using Dijkstra / BFS shortest path.
        Performs truth-preserving skill gap analysis against candidate skills.
        """
        if current_role_id not in CAREER_ROLES:
            current_role_id = "junior_frontend"
        if target_role_id not in CAREER_ROLES:
            target_role_id = "senior_fullstack"

        # Normalized candidate skill set
        raw_candidate = [s.strip() for s in (candidate_skills or []) if s]
        norm_candidate = {s.lower().strip() for s in raw_candidate}
        has_candidate_skills = len(norm_candidate) > 0

        # 1. Pathfinding
        path = cls._dijkstra_shortest_path(current_role_id, target_role_id)
        if not path:
            path = [current_role_id, target_role_id]

        # 2. Extract milestone nodes
        milestones = [CAREER_ROLES[r_id] for r_id in path if r_id in CAREER_ROLES]

        # 3. Aggregate all skills required across target role
        target_role = CAREER_ROLES[target_role_id]
        current_role = CAREER_ROLES[current_role_id]
        required_core = target_role["core_skills"]
        required_adv = target_role.get("advanced_skills", [])
        all_target_skills = required_core + required_adv

        verified_skills: List[Dict[str, Any]] = []
        transferrable_skills: List[Dict[str, Any]] = []
        missing_skills: List[Dict[str, Any]] = []

        for skill in all_target_skills:
            s_lower = skill.lower().strip()
            # Direct match
            if any(s_lower in cs or cs in s_lower for cs in norm_candidate):
                verified_skills.append({
                    "name": skill,
                    "category": SKILL_CATEGORIES.get(skill, "Core Competency"),
                    "status": "verified",
                    "importance": "core" if skill in required_core else "advanced"
                })
            else:
                # Check for partial/transferrable match via dependency graph
                prereqs = SKILL_DEPENDENCY_GRAPH.get(skill, [])
                has_prereq = any(p.lower() in norm_candidate for p in prereqs)
                if has_prereq:
                    transferrable_skills.append({
                        "name": skill,
                        "category": SKILL_CATEGORIES.get(skill, "Core Competency"),
                        "status": "transferrable",
                        "importance": "core" if skill in required_core else "advanced",
                        "transferrable_reason": f"Foundational knowledge detected ({', '.join(prereqs)})"
                    })
                else:
                    missing_skills.append({
                        "name": skill,
                        "category": SKILL_CATEGORIES.get(skill, "Core Competency"),
                        "status": "missing",
                        "importance": "core" if skill in required_core else "advanced",
                        "prerequisites": prereqs
                    })

        # Calculate Feasibility Score
        total_skills_count = max(1, len(all_target_skills))
        if has_candidate_skills:
            score = int(((len(verified_skills) * 1.0) + (len(transferrable_skills) * 0.55)) / total_skills_count * 100)
            feasibility_score = max(15, min(98, score))
        else:
            # Baseline domain transition score
            same_industry = current_role.get("industry_id") == target_role.get("industry_id")
            level_diff = abs(target_role.get("level", 2) - current_role.get("level", 1))
            feasibility_score = max(35, 85 - (level_diff * 18) - (0 if same_industry else 25))

        # Estimate total transition timeline
        total_time_months = 0
        for i in range(len(path) - 1):
            src, tgt = path[i], path[i+1]
            src_role = CAREER_ROLES[src]
            bridge = next((b for b in src_role.get("bridges_to", []) if b["target"] == tgt), None)
            total_time_months += bridge.get("time_months", 12) if bridge else 12

        # Recommended Certifications
        certs = target_role.get("certifications", [])

        # Phased Learning Roadmap
        learning_steps = cls._generate_learning_roadmap(missing_skills, transferrable_skills, target_role.get("industry_name"))

        return {
            "path_found": True,
            "path": path,
            "path_role_ids": path,
            "current_role": current_role,
            "target_role": target_role,
            "milestones": milestones,
            "total_estimated_months": total_time_months,
            "total_transition_months": total_time_months,
            "feasibility_score": feasibility_score,
            "has_candidate_skills": has_candidate_skills,
            "verified_skills": verified_skills,
            "transferrable_skills": transferrable_skills,
            "missing_skills": missing_skills,
            "skill_gap_analysis": {
                "verified_skills": [s["name"] for s in verified_skills],
                "transferrable_skills": [s["name"] for s in transferrable_skills],
                "missing_skills": [s["name"] for s in missing_skills]
            },
            "recommended_certifications": certs,
            "learning_roadmap": learning_steps,
            "salary_delta": target_role["salary_range"]["median"] - current_role["salary_range"]["median"]
        }

    @classmethod
    def get_graph_data(cls, industry_id: Optional[str] = None) -> Dict[str, Any]:
        """Alias for get_full_graph."""
        return cls.get_full_graph(industry_id)

    @classmethod
    def _dijkstra_shortest_path(cls, start: str, end: str) -> List[str]:
        """
        Dijkstra shortest path based on transition difficulty and months.
        """
        distances: Dict[str, float] = {role: float('inf') for role in CAREER_ROLES}
        distances[start] = 0
        pq = [(0, start, [start])]
        visited: Set[str] = set()

        while pq:
            dist, current, path = heapq.heappop(pq)
            if current == end:
                return path
            if current in visited:
                continue
            visited.add(current)

            for bridge in CAREER_ROLES[current].get("bridges_to", []):
                neighbor = bridge["target"]
                if neighbor in CAREER_ROLES:
                    weight = bridge.get("difficulty", 2) * 10 + bridge.get("time_months", 12)
                    new_dist = dist + weight
                    if new_dist < distances[neighbor]:
                        distances[neighbor] = new_dist
                        heapq.heappush(pq, (new_dist, neighbor, path + [neighbor]))

        # Fallback to BFS
        return cls._bfs_fallback_path(start, end)

    @classmethod
    def _bfs_fallback_path(cls, start: str, end: str) -> List[str]:
        queue = deque([[start]])
        seen = {start}
        while queue:
            path = queue.popleft()
            node = path[-1]
            if node == end:
                return path
            for bridge in CAREER_ROLES[node].get("bridges_to", []):
                nxt = bridge["target"]
                if nxt in CAREER_ROLES and nxt not in seen:
                    seen.add(nxt)
                    queue.append(path + [nxt])
        return [start, end]

    @classmethod
    def _generate_learning_roadmap(
        cls,
        missing: List[Dict[str, Any]],
        transferrable: List[Dict[str, Any]],
        industry_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        steps: List[Dict[str, Any]] = []
        phase_idx = 1
        ind = industry_name or "Professional Domain"

        # Phase 1: High-leverage transferrable skills (fastest ROI)
        if transferrable:
            steps.append({
                "phase": f"Phase {phase_idx}: Bridge Transferrable Foundations",
                "duration_weeks": "3 - 6 Weeks",
                "focus": f"Leverage existing qualifications to quickly master adjacent {ind} standards.",
                "skills": [s["name"] for s in transferrable[:3]],
                "recommended_project": "Complete a simulated practical case study or capstone milestone applying these tools."
            })
            phase_idx += 1

        # Phase 2: Core missing prerequisites
        core_missing = [s["name"] for s in missing if s.get("importance") == "core"]
        if core_missing:
            steps.append({
                "phase": f"Phase {phase_idx}: Master Core Role Prerequisites",
                "duration_weeks": "6 - 12 Weeks",
                "focus": f"Close primary execution gaps and clinical/technical skills demanded in {ind}.",
                "skills": core_missing[:4],
                "recommended_project": "Complete a verified course or industry-standard assessment with an accredited capstone."
            })
            phase_idx += 1

        # Phase 3: Advanced & Credential Capstone
        adv_missing = [s["name"] for s in missing if s.get("importance") == "advanced"]
        steps.append({
            "phase": f"Phase {phase_idx}: Advanced Credentials & Interview Readiness",
            "duration_weeks": "4 - 8 Weeks",
            "focus": f"Obtain target industry credentials, leadership competencies, and negotiation leverage for {ind}.",
            "skills": adv_missing[:3] or ["Strategic Execution", "Stakeholder Communication", "Quality & Compliance"],
            "recommended_project": "Compile an evidence-backed portfolio documenting verified outcomes and professional certifications."
        })

        return steps
