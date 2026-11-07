"""
backend/app/services/career_graph_service.py - Unified Career Path Knowledge Graph & Skill Navigator Engine.
Features:
- Full directed knowledge graph synchronized with Live Salary Explorer (9 modern industries, 46 canonical roles, 5 seniority tiers).
- Dynamic live compensation synchronization with Remote.com-grade benchmarks (REALISTIC_BENCHMARKS) & live database snapshots.
- Dijkstra shortest-path career bridge calculation with transition difficulty weights, estimated months, and skill gap analysis.
- Multi-tier skill dependency mapping and phased learning roadmaps.
"""
from typing import List, Dict, Any, Optional, Set
import heapq
from collections import deque
import logging

from app.services.navigator_service import REALISTIC_BENCHMARKS, EXPERIENCE_TIERS

logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------------
# 1. Supported Industries (Exact Match with Live Market Explorer)
# -----------------------------------------------------------------------------
INDUSTRIES = [
    {"id": "all", "name": "All Industries", "slug": "all", "icon": "Globe"},
    {"id": "tech", "name": "Technology & Software", "slug": "tech", "icon": "Code"},
    {"id": "data", "name": "Data Science & Analytics", "slug": "data", "icon": "BarChart3"},
    {"id": "product", "name": "Product & Design", "slug": "product", "icon": "Layers"},
    {"id": "finance", "name": "Finance, Banking & FinTech", "slug": "finance", "icon": "Landmark"},
    {"id": "healthcare", "name": "Healthcare & Life Sciences", "slug": "healthcare", "icon": "HeartPulse"},
    {"id": "marketing", "name": "Marketing & Growth", "slug": "marketing", "icon": "Megaphone"},
    {"id": "operations", "name": "Operations & Management", "slug": "operations", "icon": "Briefcase"},
    {"id": "engineering", "name": "Engineering & Hardware", "slug": "engineering", "icon": "Cpu"},
    {"id": "legal", "name": "Legal & Compliance", "slug": "legal", "icon": "Scale"},
]

# -----------------------------------------------------------------------------
# 2. Complete Canonical Roles Registry across 9 Industries & 5 Tiers
# -----------------------------------------------------------------------------
CAREER_ROLES: Dict[str, Dict[str, Any]] = {
    # =========================================================================
    # 1. Technology & Software
    # =========================================================================
    "junior_frontend": {
        "id": "junior_frontend",
        "title": "Junior Frontend Developer",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "Frontend",
        "level": 1,
        "level_label": "Entry Level (0-2 Yrs)",
        "salary_range": {"min": 75000, "median": 98000, "max": 118000},
        "description": "Builds responsive web interfaces, translates UI/UX designs into modular component code, and consumes RESTful APIs.",
        "core_skills": ["HTML5", "CSS3", "JavaScript", "React", "Git", "Tailwind CSS"],
        "advanced_skills": ["TypeScript", "Next.js", "Responsive Design", "Jest"],
        "certifications": ["Meta Front-End Developer Professional"],
        "bridges_to": [
            {"target": "mid_frontend", "difficulty": 2, "time_months": 14, "transition_label": "Domain Mastery"},
            {"target": "fullstack_dev", "difficulty": 3, "time_months": 18, "transition_label": "Full Stack Expansion"}
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
        "salary_range": {"min": 105000, "median": 134000, "max": 162000},
        "description": "Specializes in client architecture, Web Vitals performance optimization, state orchestration, and complex interactive SPAs.",
        "core_skills": ["TypeScript", "React", "Next.js", "State Management (Redux/Zustand)", "REST APIs", "Jest/Testing Library"],
        "advanced_skills": ["GraphQL", "WebSockets", "Web Workers", "CI/CD"],
        "certifications": ["AWS Certified Developer - Associate"],
        "bridges_to": [
            {"target": "senior_frontend", "difficulty": 2, "time_months": 18, "transition_label": "Senior Architecture"},
            {"target": "fullstack_dev", "difficulty": 2, "time_months": 12, "transition_label": "Full Stack Pivot"}
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
        "salary_range": {"min": 142000, "median": 174000, "max": 210000},
        "description": "Establishes enterprise design systems, micro-frontend modularity, build tooling pipelines, accessibility standards, and mentoring.",
        "core_skills": ["TypeScript", "Micro-Frontends", "Performance Auditing", "Design Systems", "WebAssembly", "CI/CD"],
        "advanced_skills": ["Distributed Systems", "Cloud Edge Rendering", "Security (CSP/OWASP)"],
        "certifications": ["AWS Certified Solutions Architect - Associate"],
        "bridges_to": [
            {"target": "lead_fullstack", "difficulty": 3, "time_months": 18, "transition_label": "Staff Leadership"},
            {"target": "engineering_mgr", "difficulty": 4, "time_months": 24, "transition_label": "Engineering Management"}
        ]
    },
    "fullstack_dev": {
        "id": "fullstack_dev",
        "title": "Software Engineer",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "Full Stack",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 115000, "median": 142500, "max": 172000},
        "description": "Delivers end-to-end features spanning dynamic client interfaces, relational database modeling, and server-side API endpoints.",
        "core_skills": ["TypeScript", "React", "Python", "SQL (PostgreSQL)", "REST APIs", "Docker", "Node.js"],
        "advanced_skills": ["GraphQL", "Redis Caching", "FastAPI", "Cloud Infrastructure"],
        "certifications": ["AWS Certified Cloud Practitioner"],
        "bridges_to": [
            {"target": "senior_fullstack", "difficulty": 2, "time_months": 18, "transition_label": "Senior Promotion"},
            {"target": "backend_dev", "difficulty": 2, "time_months": 12, "transition_label": "Backend Focus"},
            {"target": "devops_eng", "difficulty": 3, "time_months": 16, "transition_label": "Platform & Cloud Shift"}
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
        "salary_range": {"min": 145000, "median": 178000, "max": 218000},
        "description": "Architects resilient multi-tier web platforms, microservices architectures, data migration pipelines, and high-concurrency systems.",
        "core_skills": ["TypeScript", "Python / Go", "Distributed Systems", "PostgreSQL", "Docker", "Kubernetes", "Redis"],
        "advanced_skills": ["Event-Driven Architecture", "Kafka", "High Concurrency", "Cost Optimization"],
        "certifications": ["AWS Certified Solutions Architect - Associate"],
        "bridges_to": [
            {"target": "lead_fullstack", "difficulty": 3, "time_months": 18, "transition_label": "Staff / Principal"},
            {"target": "cloud_architect", "difficulty": 3, "time_months": 16, "transition_label": "Cloud Architecture"},
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
        "level_label": "Staff / Lead (8-10 Yrs)",
        "salary_range": {"min": 185000, "median": 230000, "max": 278000},
        "description": "Sets organizational technical direction, leads cross-team architecture reviews, mentors senior staff, and enforces resilience standards.",
        "core_skills": ["System Design", "Distributed Systems", "Cloud Architecture", "Event Streaming", "Technical Roadmapping"],
        "advanced_skills": ["Zero Trust Security", "Multi-Region Topology", "Executive Stakeholder Management"],
        "certifications": ["AWS Certified Solutions Architect - Professional"],
        "bridges_to": [
            {"target": "engineering_mgr", "difficulty": 3, "time_months": 18, "transition_label": "VP / Director Track"},
            {"target": "principal_cloud", "difficulty": 2, "time_months": 14, "transition_label": "Fellow / Principal Track"}
        ]
    },
    "backend_dev": {
        "id": "backend_dev",
        "title": "Backend Systems Engineer",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "Backend",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 118000, "median": 149000, "max": 182000},
        "description": "Builds high-throughput microservices, distributed transaction managers, caching layers, and database schemas.",
        "core_skills": ["Python / Go", "PostgreSQL", "REST & gRPC", "Docker", "Redis", "Kafka"],
        "advanced_skills": ["Database Sharding", "Distributed Locks", "Observability (OpenTelemetry)"],
        "certifications": ["AWS Certified Developer"],
        "bridges_to": [
            {"target": "senior_fullstack", "difficulty": 2, "time_months": 16, "transition_label": "Full Stack Senior"},
            {"target": "cloud_architect", "difficulty": 3, "time_months": 18, "transition_label": "Cloud Systems"}
        ]
    },
    "devops_eng": {
        "id": "devops_eng",
        "title": "DevOps & Platform Engineer",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "DevOps & Cloud",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 120000, "median": 152000, "max": 185000},
        "description": "Automates continuous delivery, Infrastructure as Code (Terraform), Kubernetes cluster orchestration, and platform telemetry.",
        "core_skills": ["Kubernetes", "Docker", "Terraform", "CI/CD (GitHub Actions)", "Linux Shell", "AWS / GCP"],
        "advanced_skills": ["Helm", "Service Mesh (Istio)", "Prometheus & Grafana", "GitOps (ArgoCD)"],
        "certifications": ["Certified Kubernetes Administrator (CKA)"],
        "bridges_to": [
            {"target": "cloud_architect", "difficulty": 2, "time_months": 14, "transition_label": "Cloud Architect"},
            {"target": "security_eng", "difficulty": 3, "time_months": 16, "transition_label": "DevSecOps Specialization"}
        ]
    },
    "cloud_architect": {
        "id": "cloud_architect",
        "title": "Cloud Solutions Architect",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "DevOps & Cloud",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 156000, "median": 182000, "max": 222000},
        "description": "Designs hybrid-cloud topologies, multi-region failover, cost-efficiency governors, and regulatory data sovereignty controls.",
        "core_skills": ["AWS / GCP / Azure", "Terraform", "Microservices Design", "Cost Optimization (FinOps)", "Zero Trust"],
        "advanced_skills": ["Multi-Region Disaster Recovery", "Transit Gateways", "Enterprise Governance"],
        "certifications": ["AWS Certified Solutions Architect - Professional", "Google Cloud Professional Architect"],
        "bridges_to": [
            {"target": "principal_cloud", "difficulty": 2, "time_months": 16, "transition_label": "Principal Promotion"},
            {"target": "lead_fullstack", "difficulty": 3, "time_months": 18, "transition_label": "Staff Leadership"}
        ]
    },
    "principal_cloud": {
        "id": "principal_cloud",
        "title": "Principal Cloud Solutions Architect",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "DevOps & Cloud",
        "level": 4,
        "level_label": "Staff / Lead (8-10 Yrs)",
        "salary_range": {"min": 210000, "median": 255000, "max": 315000},
        "description": "Guides enterprise-wide cloud modernization, sovereign cloud compliance, multi-cloud strategy, and high-resilience systems.",
        "core_skills": ["Enterprise Architecture", "Multi-Cloud", "FinOps", "Disaster Recovery", "Zero Trust"],
        "advanced_skills": ["C-Suite Advisory", "Vendor Negotiation", "AI Infrastructure"],
        "certifications": ["AWS Solutions Architect - Professional", "TOGAF 9"],
        "bridges_to": [
            {"target": "engineering_mgr", "difficulty": 3, "time_months": 18, "transition_label": "Executive VP"}
        ]
    },
    "security_eng": {
        "id": "security_eng",
        "title": "Cybersecurity Architect",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "Security",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 142000, "median": 168000, "max": 205000},
        "description": "Hardens production environments, designs threat detection pipelines, leads incident response, and manages SOC2 compliance.",
        "core_skills": ["Threat Modeling", "SIEM (Splunk/Sentinel)", "Vulnerability Auditing", "Network Security", "IAM Governance"],
        "advanced_skills": ["Zero Trust", "Penetration Testing", "Cloud Security Posture (CSPM)"],
        "certifications": ["CISSP", "Certified Information Security Manager (CISM)"],
        "bridges_to": [
            {"target": "cloud_architect", "difficulty": 2, "time_months": 14, "transition_label": "Cloud Security Lead"}
        ]
    },
    "mobile_dev": {
        "id": "mobile_dev",
        "title": "Mobile Application Developer",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "Mobile",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 105000, "median": 138000, "max": 168000},
        "description": "Builds high-performance native and cross-platform mobile apps for iOS and Android.",
        "core_skills": ["React Native / Flutter", "Swift / Kotlin", "Mobile UI/UX", "REST APIs", "App Store Deployment"],
        "advanced_skills": ["Offline Sync", "Push Notifications", "Performance Profiling"],
        "certifications": ["Google Associate Android Developer"],
        "bridges_to": [
            {"target": "fullstack_dev", "difficulty": 2, "time_months": 12, "transition_label": "Full Stack Switch"}
        ]
    },
    "qa_engineer": {
        "id": "qa_engineer",
        "title": "QA & Automation Engineer",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "QA",
        "level": 1,
        "level_label": "Entry Level (0-2 Yrs)",
        "salary_range": {"min": 68000, "median": 85000, "max": 105000},
        "description": "Writes automated test suites, end-to-end regression frameworks, and load testing harnesses.",
        "core_skills": ["Playwright / Cypress", "Selenium", "Python / TypeScript", "CI/CD Integration", "Test Case Design"],
        "advanced_skills": ["Performance Testing (k6)", "API Testing (Postman)", "Chaos Testing"],
        "certifications": ["ISTQB Certified Tester"],
        "bridges_to": [
            {"target": "fullstack_dev", "difficulty": 2, "time_months": 14, "transition_label": "Software Engineer Track"},
            {"target": "devops_eng", "difficulty": 3, "time_months": 16, "transition_label": "DevOps Shift"}
        ]
    },
    "systems_embedded_eng": {
        "id": "systems_embedded_eng",
        "title": "Systems & Embedded Engineer",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "Systems",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 110000, "median": 142000, "max": 172000},
        "description": "Programs firmware, microcontrollers, real-time operating systems (RTOS), and hardware-software interfaces.",
        "core_skills": ["C / C++", "RTOS", "Linux Kernel", "Microcontrollers (ARM/ESP32)", "I2C/SPI/UART"],
        "advanced_skills": ["Rust Embedded", "Board Bringup", "Power Optimization"],
        "certifications": ["ARM Accredited Engineer"],
        "bridges_to": [
            {"target": "backend_dev", "difficulty": 2, "time_months": 14, "transition_label": "High-Performance Systems"}
        ]
    },
    "engineering_mgr": {
        "id": "engineering_mgr",
        "title": "Engineering Manager / Director",
        "industry_id": "tech",
        "industry_name": "Technology & Software",
        "category": "Leadership",
        "level": 5,
        "level_label": "Director / Principal (10+ Yrs)",
        "salary_range": {"min": 220000, "median": 275000, "max": 350000},
        "description": "Aligns engineering teams with product OKRs, oversees hiring & retention, leads high-stakes delivery, and manages budget.",
        "core_skills": ["People Leadership", "System Architecture", "Agile Execution", "Budget Management", "Executive Communication"],
        "advanced_skills": ["Organizational Design", "M&A Tech Due Diligence", "Board Reporting"],
        "certifications": ["Certified Scrum Product Owner (CSPO)"],
        "bridges_to": []
    },

    # =========================================================================
    # 2. Data Science & Analytics
    # =========================================================================
    "data_analyst": {
        "id": "data_analyst",
        "title": "Data Analyst",
        "industry_id": "data",
        "industry_name": "Data Science & Analytics",
        "category": "Analytics",
        "level": 1,
        "level_label": "Entry Level (0-2 Yrs)",
        "salary_range": {"min": 62000, "median": 75000, "max": 92000},
        "description": "Extracts insights from structured datasets, generates business intelligence dashboards, and creates SQL pipelines.",
        "core_skills": ["SQL", "Excel / Sheets", "Tableau / PowerBI", "Python / Pandas", "Descriptive Statistics"],
        "advanced_skills": ["A/B Testing", "ETL Pipelines", "Data Storytelling"],
        "certifications": ["Google Data Analytics Professional Certificate"],
        "bridges_to": [
            {"target": "bi_analyst", "difficulty": 2, "time_months": 12, "transition_label": "BI Specialist"},
            {"target": "data_scientist", "difficulty": 3, "time_months": 18, "transition_label": "Data Science Track"}
        ]
    },
    "bi_analyst": {
        "id": "bi_analyst",
        "title": "Business Intelligence Analyst",
        "industry_id": "data",
        "industry_name": "Data Science & Analytics",
        "category": "Analytics",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 85000, "median": 105000, "max": 128000},
        "description": "Designs enterprise semantic models, KPI dashboards, automated reporting suites, and data governance standards.",
        "core_skills": ["Advanced SQL", "Tableau", "Power BI", "Data Warehousing (Snowflake/BigQuery)", "Data Modeling"],
        "advanced_skills": ["dbt", "Looker", "Dimensional Modeling (Star Schema)"],
        "certifications": ["Tableau Certified Data Analyst"],
        "bridges_to": [
            {"target": "data_engineer", "difficulty": 3, "time_months": 16, "transition_label": "Data Engineering Pivot"},
            {"target": "data_scientist", "difficulty": 2, "time_months": 14, "transition_label": "Predictive Modeling Track"}
        ]
    },
    "data_engineer": {
        "id": "data_engineer",
        "title": "Data Engineer",
        "industry_id": "data",
        "industry_name": "Data Science & Analytics",
        "category": "Data Engineering",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 115000, "median": 148000, "max": 178000},
        "description": "Builds robust real-time and batch data pipelines, data lakehouses, and high-performance ingestion architectures.",
        "core_skills": ["Python", "SQL", "Apache Spark", "Airflow", "Snowflake / BigQuery", "dbt"],
        "advanced_skills": ["Kafka", "Delta Lake", "Data Quality Governance", "AWS EMR"],
        "certifications": ["Google Professional Data Engineer", "Databricks Certified Data Engineer"],
        "bridges_to": [
            {"target": "bigdata_architect", "difficulty": 2, "time_months": 18, "transition_label": "Platform Architect"},
            {"target": "ml_engineer", "difficulty": 3, "time_months": 16, "transition_label": "MLOps Shift"}
        ]
    },
    "data_scientist": {
        "id": "data_scientist",
        "title": "Data Scientist",
        "industry_id": "data",
        "industry_name": "Data Science & Analytics",
        "category": "Data Science",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 115000, "median": 146000, "max": 178000},
        "description": "Builds predictive statistical models, regression frameworks, customer churn predictors, and hypothesis experiments.",
        "core_skills": ["Python", "Scikit-Learn", "SQL", "Pandas & NumPy", "Hypothesis Testing", "Machine Learning"],
        "advanced_skills": ["XGBoost", "Deep Learning", "A/B Testing Experimentation", "Feature Stores"],
        "certifications": ["IBM Data Science Professional Certificate"],
        "bridges_to": [
            {"target": "ml_engineer", "difficulty": 2, "time_months": 14, "transition_label": "ML Engineering"},
            {"target": "quant_analyst", "difficulty": 3, "time_months": 16, "transition_label": "Quantitative Finance"}
        ]
    },
    "ml_engineer": {
        "id": "ml_engineer",
        "title": "Machine Learning Engineer",
        "industry_id": "data",
        "industry_name": "Data Science & Analytics",
        "category": "AI / ML",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 135000, "median": 172000, "max": 210000},
        "description": "Deploys, monitors, and optimizes machine learning models and LLM agent pipelines in production at scale.",
        "core_skills": ["Python", "PyTorch / TensorFlow", "MLflow", "Docker", "Vector Databases (pgvector/Pinecone)", "FastAPI"],
        "advanced_skills": ["LLM Fine-Tuning", "vLLM Serving", "Distributed Training (DeepSpeed)", "Triton Server"],
        "certifications": ["AWS Certified Machine Learning - Specialty"],
        "bridges_to": [
            {"target": "ai_researcher", "difficulty": 3, "time_months": 20, "transition_label": "AI Research Staff"},
            {"target": "bigdata_architect", "difficulty": 2, "time_months": 16, "transition_label": "AI Platform Architect"}
        ]
    },
    "bigdata_architect": {
        "id": "bigdata_architect",
        "title": "Big Data Architect",
        "industry_id": "data",
        "industry_name": "Data Science & Analytics",
        "category": "Data Engineering",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 154000, "median": 182000, "max": 218000},
        "description": "Architects petabyte-scale data lakes, streaming analytics clusters, real-time feature stores, and governance.",
        "core_skills": ["Distributed Storage (S3/HDFS)", "Spark Streaming", "Kafka", "Databricks", "Data Mesh Design"],
        "advanced_skills": ["Iceberg / Delta", "Cross-Region Replication", "Data Lineage"],
        "certifications": ["Databricks Certified Solutions Architect"],
        "bridges_to": [
            {"target": "ai_researcher", "difficulty": 3, "time_months": 18, "transition_label": "Research Lead"}
        ]
    },
    "ai_researcher": {
        "id": "ai_researcher",
        "title": "AI / Deep Learning Researcher",
        "industry_id": "data",
        "industry_name": "Data Science & Analytics",
        "category": "AI / ML",
        "level": 4,
        "level_label": "Staff / Lead (8-10 Yrs)",
        "salary_range": {"min": 185000, "median": 245000, "max": 320000},
        "description": "Publishes novel generative architectures, diffusion models, attention mechanisms, and multi-modal neural paradigms.",
        "core_skills": ["PyTorch", "Transformer Architectures", "CUDA / Triton", "Mathematical Optimization", "Prompt Engineering"],
        "advanced_skills": ["Reasoning RL (RLHF/GRPO)", "Quantization (AWQ/GPTQ)", "Synthetic Data Generation"],
        "certifications": ["NVIDIA Deep Learning Institute Certificate"],
        "bridges_to": []
    },
    "quant_analyst": {
        "id": "quant_analyst",
        "title": "Quantitative Analyst / Modeler",
        "industry_id": "data",
        "industry_name": "Data Science & Analytics",
        "category": "Quantitative",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 155000, "median": 188000, "max": 235000},
        "description": "Designs statistical arbitrage algorithms, risk neutralization strategies, and econometric pricing models.",
        "core_skills": ["Python / C++", "Stochastic Calculus", "Time Series Econometrics", "Monte Carlo Methods", "NumPy/SciPy"],
        "advanced_skills": ["Order Book Microstructure", "Low-Latency Simulation", "High-Frequency Signals"],
        "certifications": ["CFA Level 1", "Certificate in Quantitative Finance (CQF)"],
        "bridges_to": [
            {"target": "quant_trader", "difficulty": 2, "time_months": 14, "transition_label": "Proprietary Trading Track"}
        ]
    },

    # =========================================================================
    # 3. Product & Design
    # =========================================================================
    "uiux_designer": {
        "id": "uiux_designer",
        "title": "UI/UX Designer",
        "industry_id": "product",
        "industry_name": "Product & Design",
        "category": "Design & UX",
        "level": 1,
        "level_label": "Entry Level (0-2 Yrs)",
        "salary_range": {"min": 72000, "median": 92000, "max": 112000},
        "description": "Creates wireframes, high-fidelity Figma components, interactive prototypes, and conducts usability testing.",
        "core_skills": ["Figma", "UI Component Design", "Wireframing", "User Journey Mapping", "Prototyping"],
        "advanced_skills": ["Design Systems", "Accessibility (WCAG 2.1)", "User Research"],
        "certifications": ["Google UX Design Professional Certificate"],
        "bridges_to": [
            {"target": "design_systems_lead", "difficulty": 2, "time_months": 16, "transition_label": "Design Systems Lead"},
            {"target": "product_manager", "difficulty": 3, "time_months": 18, "transition_label": "Product Management Pivot"}
        ]
    },
    "ux_researcher": {
        "id": "ux_researcher",
        "title": "User Experience Researcher",
        "industry_id": "product",
        "industry_name": "Product & Design",
        "category": "Design & UX",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 95000, "median": 124000, "max": 152000},
        "description": "Leads qualitative customer interviews, usability benchmarks, quantitative user surveys, and heuristic evaluations.",
        "core_skills": ["User Interviews", "Usability Testing", "Survey Design", "Competitive Analysis", "Heuristic Evaluation"],
        "advanced_skills": ["Eye-Tracking Studies", "Card Sorting", "Statistical User Analytics"],
        "certifications": ["Nielsen Norman Group UX Master Certified"],
        "bridges_to": [
            {"target": "product_manager", "difficulty": 2, "time_months": 14, "transition_label": "Product Strategy"}
        ]
    },
    "design_systems_lead": {
        "id": "design_systems_lead",
        "title": "Design Systems Lead",
        "industry_id": "product",
        "industry_name": "Product & Design",
        "category": "Design & UX",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 128000, "median": 152000, "max": 184000},
        "description": "Maintains scalable design token architectures, multi-platform Figma component libraries, and frontend parity.",
        "core_skills": ["Design Tokens", "Figma Auto-Layout", "WCAG 2.1 AA", "Cross-Platform Guidelines", "Component Documentation"],
        "advanced_skills": ["CSS / Tailwind Integration", "Design Ops", "Brand Identity"],
        "certifications": ["Interaction Design Foundation Certified"],
        "bridges_to": [
            {"target": "vp_product", "difficulty": 4, "time_months": 24, "transition_label": "Head of Design"}
        ]
    },
    "product_manager": {
        "id": "product_manager",
        "title": "Product Manager",
        "industry_id": "product",
        "industry_name": "Product & Design",
        "category": "Product Strategy",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 115000, "median": 148000, "max": 182000},
        "description": "Defines product roadmaps, translates customer problems into PRDs, prioritizes backlogs, and tracks business KPIs.",
        "core_skills": ["Product Discovery", "PRD Authoring", "Roadmap Planning", "Agile / Scrum", "Data-Driven Prioritization"],
        "advanced_skills": ["Financial Modeling", "Market Segmentation", "Executive Alignment"],
        "certifications": ["Certified Scrum Product Owner (CSPO)"],
        "bridges_to": [
            {"target": "tech_pm", "difficulty": 2, "time_months": 14, "transition_label": "Technical Product Track"},
            {"target": "vp_product", "difficulty": 3, "time_months": 22, "transition_label": "Director of Product"}
        ]
    },
    "tech_pm": {
        "id": "tech_pm",
        "title": "Technical Product Manager",
        "industry_id": "product",
        "industry_name": "Product & Design",
        "category": "Product Strategy",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 138000, "median": 162000, "max": 196000},
        "description": "Leads complex technical platform products, developer APIs, distributed infrastructure tools, and cloud SDKs.",
        "core_skills": ["API Design", "System Architecture Knowledge", "PRD Authoring", "Developer Experience", "Technical Backlog"],
        "advanced_skills": ["Microservices Strategy", "Cloud Cost Governance", "SLA / SLO Management"],
        "certifications": ["AWS Certified Cloud Practitioner", "Pragmatic Institute Certified"],
        "bridges_to": [
            {"target": "vp_product", "difficulty": 3, "time_months": 20, "transition_label": "Chief Product Officer Track"}
        ]
    },
    "vp_product": {
        "id": "vp_product",
        "title": "VP of Product / Chief Product Officer",
        "industry_id": "product",
        "industry_name": "Product & Design",
        "category": "Product Strategy",
        "level": 5,
        "level_label": "Director / Principal (10+ Yrs)",
        "salary_range": {"min": 215000, "median": 270000, "max": 345000},
        "description": "Owns organizational product vision, multi-product portfolio strategy, investor updates, and P&L allocation.",
        "core_skills": ["Portfolio Strategy", "Executive Leadership", "P&L Management", "Go-To-Market Alignment", "Board Advisory"],
        "advanced_skills": ["Mergers & Acquisitions", "International Expansion"],
        "certifications": [],
        "bridges_to": []
    },

    # =========================================================================
    # 4. Finance, Banking & FinTech
    # =========================================================================
    "financial_analyst": {
        "id": "financial_analyst",
        "title": "Financial Analyst",
        "industry_id": "finance",
        "industry_name": "Finance, Banking & FinTech",
        "category": "Corporate Finance",
        "level": 1,
        "level_label": "Entry Level (0-2 Yrs)",
        "salary_range": {"min": 70000, "median": 86000, "max": 105000},
        "description": "Conducts financial statement analysis, budget forecasting, variance analysis, and DCF corporate valuations.",
        "core_skills": ["Financial Modeling", "Excel (VBA/Macros)", "DCF Valuation", "Variance Analysis", "Accounting Standards"],
        "advanced_skills": ["Power BI", "SQL", "ERP Systems (SAP/NetSuite)"],
        "certifications": ["CFA Level 1 Candidate"],
        "bridges_to": [
            {"target": "senior_accountant", "difficulty": 2, "time_months": 14, "transition_label": "Accounting Track"},
            {"target": "risk_analyst", "difficulty": 2, "time_months": 14, "transition_label": "Risk & Controls Shift"},
            {"target": "ib_associate", "difficulty": 3, "time_months": 18, "transition_label": "Investment Banking Track"}
        ]
    },
    "senior_accountant": {
        "id": "senior_accountant",
        "title": "Senior Corporate Accountant",
        "industry_id": "finance",
        "industry_name": "Finance, Banking & FinTech",
        "category": "Accounting",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 89000, "median": 106000, "max": 128000},
        "description": "Oversees monthly ledger closing, GAAP revenue recognition, statutory auditing, and corporate tax compliance.",
        "core_skills": ["US GAAP", "General Ledger", "Internal Controls (SOX)", "Auditing", "Financial Reporting"],
        "advanced_skills": ["IFRS", "Corporate Tax Planning", "ERP System Migration"],
        "certifications": ["Certified Public Accountant (CPA)"],
        "bridges_to": [
            {"target": "finance_director", "difficulty": 3, "time_months": 22, "transition_label": "Controller / Director"}
        ]
    },
    "risk_analyst": {
        "id": "risk_analyst",
        "title": "Risk Management Specialist",
        "industry_id": "finance",
        "industry_name": "Finance, Banking & FinTech",
        "category": "Risk & Controls",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 104000, "median": 125000, "max": 154000},
        "description": "Calculates Value at Risk (VaR), stress-tests liquidity scenarios, and monitors credit exposure for institutions.",
        "core_skills": ["Value at Risk (VaR)", "Credit Scoring Models", "Stress Testing", "Regulatory Capital (Basel III)", "Python"],
        "advanced_skills": ["Counterparty Risk", "Derivatives Modeling", "Model Validation"],
        "certifications": ["Financial Risk Manager (FRM)"],
        "bridges_to": [
            {"target": "quant_trader", "difficulty": 3, "time_months": 18, "transition_label": "Trading Pivot"},
            {"target": "finance_director", "difficulty": 3, "time_months": 20, "transition_label": "Chief Risk Officer"}
        ]
    },
    "ib_associate": {
        "id": "ib_associate",
        "title": "Investment Banking Associate",
        "industry_id": "finance",
        "industry_name": "Finance, Banking & FinTech",
        "category": "Investment Banking",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 158000, "median": 192000, "max": 245000},
        "description": "Executes complex M&A transactions, LBO models, pitch books, debt financing rounds, and IPO roadshows.",
        "core_skills": ["M&A Valuation", "LBO Modeling", "Pitch Book Authoring", "Due Diligence", "Capital Markets"],
        "advanced_skills": ["Syndicated Debt", "Fairness Opinions", "Hostile Defense"],
        "certifications": ["FINRA Series 79", "FINRA Series 63"],
        "bridges_to": [
            {"target": "finance_director", "difficulty": 2, "time_months": 18, "transition_label": "Managing Director / CFO Track"}
        ]
    },
    "quant_trader": {
        "id": "quant_trader",
        "title": "Quantitative Trader",
        "industry_id": "finance",
        "industry_name": "Finance, Banking & FinTech",
        "category": "Trading & Markets",
        "level": 4,
        "level_label": "Staff / Lead (8-10 Yrs)",
        "salary_range": {"min": 175000, "median": 245000, "max": 380000},
        "description": "Deploys algorithmic market-making strategies, executes delta-hedging, and monitors real-time PnL volatility.",
        "core_skills": ["Algorithmic Execution", "Order Flow Analysis", "Derivatives Pricing", "C++ / Python", "Delta Neutral Hedging"],
        "advanced_skills": ["Low-Latency Routing", "Exchange Connectivity (FIX Protocol)"],
        "certifications": ["CQF"],
        "bridges_to": []
    },
    "finance_director": {
        "id": "finance_director",
        "title": "Finance Director / CFO",
        "industry_id": "finance",
        "industry_name": "Finance, Banking & FinTech",
        "category": "Corporate Finance",
        "level": 5,
        "level_label": "Director / Principal (10+ Yrs)",
        "salary_range": {"min": 210000, "median": 265000, "max": 350000},
        "description": "Directs capital allocation, treasury management, fundraising rounds, audit committees, and board financial reporting.",
        "core_skills": ["Capital Structure", "Treasury & Liquidity", "Investor Relations", "Tax Structuring", "Board Governance"],
        "advanced_skills": ["IPO Execution", "International Transfer Pricing"],
        "certifications": ["CPA", "CFA"],
        "bridges_to": []
    },

    # =========================================================================
    # 5. Healthcare & Life Sciences
    # =========================================================================
    "health_informatics": {
        "id": "health_informatics",
        "title": "Health Informatics Specialist",
        "industry_id": "healthcare",
        "industry_name": "Healthcare & Life Sciences",
        "category": "Health Tech",
        "level": 1,
        "level_label": "Entry Level (0-2 Yrs)",
        "salary_range": {"min": 72000, "median": 88000, "max": 108000},
        "description": "Maintains electronic health records (EHR/Epic), ensures HL7/FHIR data interoperability, and optimizes clinical workflows.",
        "core_skills": ["EHR (Epic/Cerner)", "HL7 / FHIR Standards", "Healthcare SQL", "HIPAA Compliance", "Clinical Data Entry"],
        "advanced_skills": ["Medical Terminology (SNOMED/ICD-10)", "Clinical Decision Support"],
        "certifications": ["CAHIMS (Certified Associate in Healthcare Information & Management Systems)"],
        "bridges_to": [
            {"target": "clinical_data_mgr", "difficulty": 2, "time_months": 14, "transition_label": "Clinical Trials Track"},
            {"target": "bioinformatics_scientist", "difficulty": 3, "time_months": 18, "transition_label": "Bioinformatics Shift"}
        ]
    },
    "clinical_data_mgr": {
        "id": "clinical_data_mgr",
        "title": "Clinical Data Manager",
        "industry_id": "healthcare",
        "industry_name": "Healthcare & Life Sciences",
        "category": "Clinical Research",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 98000, "median": 118000, "max": 142000},
        "description": "Designs Case Report Forms (eCRFs), manages EDC databases, enforces GCP standards, and prepares CDISC clinical submissions.",
        "core_skills": ["CDISC (SDTM/ADaM)", "EDC Systems (Medidata Rave)", "GCP / FDA Regulations", "Data Validation Plans", "SAS / R"],
        "advanced_skills": ["Clinical Study Reports", "Audit Preparation", "Biostatistics"],
        "certifications": ["Certified Clinical Data Manager (CCDM)"],
        "bridges_to": [
            {"target": "healthcare_director", "difficulty": 3, "time_months": 22, "transition_label": "Operations Director Track"}
        ]
    },
    "bioinformatics_scientist": {
        "id": "bioinformatics_scientist",
        "title": "Bioinformatics Scientist",
        "industry_id": "healthcare",
        "industry_name": "Healthcare & Life Sciences",
        "category": "Computational Biology",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 114000, "median": 136000, "max": 166000},
        "description": "Analyzes next-generation sequencing (NGS) data, builds variant calling pipelines, and models protein-ligand interactions.",
        "core_skills": ["Next-Generation Sequencing (NGS)", "Python / Biopython", "R / Bioconductor", "Variant Calling (GATK)", "Bioinformatics Databases"],
        "advanced_skills": ["AlphaFold & Protein Modeling", "RNA-seq Pipeline Design", "Single-Cell Genomics"],
        "certifications": ["Bioinformatics Specialist Certificate"],
        "bridges_to": [
            {"target": "healthcare_director", "difficulty": 3, "time_months": 20, "transition_label": "Biotech Leadership"}
        ]
    },
    "pharmacist_msl": {
        "id": "pharmacist_msl",
        "title": "Pharmacist / Medical Science Liaison",
        "industry_id": "healthcare",
        "industry_name": "Healthcare & Life Sciences",
        "category": "Clinical Practice",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 128000, "median": 142000, "max": 160000},
        "description": "Communicates clinical trial findings with medical KOLs, monitors pharmacovigilance reports, and advises healthcare providers.",
        "core_skills": ["Pharmacotherapy", "KOL Engagement", "Clinical Protocol Analysis", "Pharmacovigilance", "Regulatory Affairs"],
        "advanced_skills": ["Medical Writing", "Therapeutic Area Expertise (Oncology/Immunology)"],
        "certifications": ["Board Certified Pharmacotherapy Specialist (BCPS)"],
        "bridges_to": [
            {"target": "healthcare_director", "difficulty": 2, "time_months": 16, "transition_label": "Medical Director Track"}
        ]
    },
    "healthcare_director": {
        "id": "healthcare_director",
        "title": "Healthcare Operations Director",
        "industry_id": "healthcare",
        "industry_name": "Healthcare & Life Sciences",
        "category": "Leadership",
        "level": 5,
        "level_label": "Director / Principal (10+ Yrs)",
        "salary_range": {"min": 185000, "median": 230000, "max": 295000},
        "description": "Oversees hospital clinical operations, healthcare informatics strategy, regulatory accreditation, and P&L performance.",
        "core_skills": ["Hospital Operations", "Clinical Quality Assurance", "Accreditation (Joint Commission)", "Healthcare Finance", "Executive Leadership"],
        "advanced_skills": ["Value-Based Care Strategy", "Health System Mergers"],
        "certifications": ["FACHE (Fellow of the American College of Healthcare Executives)"],
        "bridges_to": []
    },

    # =========================================================================
    # 6. Marketing & Growth
    # =========================================================================
    "content_strategist": {
        "id": "content_strategist",
        "title": "Content & Brand Strategist",
        "industry_id": "marketing",
        "industry_name": "Marketing & Growth",
        "category": "Brand & Content",
        "level": 1,
        "level_label": "Entry Level (0-2 Yrs)",
        "salary_range": {"min": 65000, "median": 82000, "max": 102000},
        "description": "Develops thought-leadership narratives, omnichannel editorial calendars, organic SEO content, and brand messaging guides.",
        "core_skills": ["SEO Content Writing", "Editorial Calendars", "Copywriting", "Social Media Strategy", "Content Management Systems"],
        "advanced_skills": ["Conversion Rate Optimization (CRO)", "Brand Positioning", "Video Content Production"],
        "certifications": ["HubSpot Content Marketing Certified"],
        "bridges_to": [
            {"target": "growth_marketer", "difficulty": 2, "time_months": 12, "transition_label": "Performance Shift"},
            {"target": "product_marketer", "difficulty": 2, "time_months": 14, "transition_label": "Product Marketing Pivot"}
        ]
    },
    "growth_marketer": {
        "id": "growth_marketer",
        "title": "Growth & Performance Marketer",
        "industry_id": "marketing",
        "industry_name": "Marketing & Growth",
        "category": "Performance Marketing",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 96000, "median": 116000, "max": 142000},
        "description": "Executes multi-channel paid acquisition campaigns (Google/Meta/LinkedIn), manages ROAS bidding, and runs A/B experiments.",
        "core_skills": ["Paid Search & Social", "CAC / LTV Modeling", "Google Analytics 4", "Conversion Funnels", "A/B Testing"],
        "advanced_skills": ["SQL for Marketers", "Multi-Touch Attribution", "Lifecycle Email Automation"],
        "certifications": ["Google Ads Search Professional", "Meta Certified Media Planning Professional"],
        "bridges_to": [
            {"target": "product_marketer", "difficulty": 2, "time_months": 14, "transition_label": "Product Marketing Lead"},
            {"target": "marketing_director", "difficulty": 3, "time_months": 22, "transition_label": "Head of Growth / Marketing"}
        ]
    },
    "product_marketer": {
        "id": "product_marketer",
        "title": "Product Marketing Manager",
        "industry_id": "marketing",
        "industry_name": "Marketing & Growth",
        "category": "Product Marketing",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 116000, "median": 138000, "max": 168000},
        "description": "Owns product go-to-market (GTM) launches, competitive battlecards, sales enablement toolkits, and pricing positioning.",
        "core_skills": ["Go-To-Market (GTM) Strategy", "Customer Personas", "Competitive Battlecards", "Sales Enablement", "Value Messaging"],
        "advanced_skills": ["Pricing & Packaging Optimization", "Analyst Relations (Gartner/Forrester)"],
        "certifications": ["Product Marketing Alliance (PMA) Certified"],
        "bridges_to": [
            {"target": "marketing_director", "difficulty": 2, "time_months": 18, "transition_label": "CMO / Marketing Director"}
        ]
    },
    "marketing_director": {
        "id": "marketing_director",
        "title": "Digital Marketing Director",
        "industry_id": "marketing",
        "industry_name": "Marketing & Growth",
        "category": "Leadership",
        "level": 5,
        "level_label": "Director / Principal (10+ Yrs)",
        "salary_range": {"min": 165000, "median": 215000, "max": 280000},
        "description": "Spearheads global marketing strategy, manages eight-figure paid media budgets, oversees PR & comms, and directs demand gen.",
        "core_skills": ["Marketing Strategy", "Budget Allocation", "Brand Equity", "Executive Team Collaboration", "Agency Management"],
        "advanced_skills": ["Public Relations Management", "Global Brand Strategy"],
        "certifications": [],
        "bridges_to": []
    },

    # =========================================================================
    # 7. Operations & Management
    # =========================================================================
    "tech_recruiter": {
        "id": "tech_recruiter",
        "title": "Technical Recruiter",
        "industry_id": "operations",
        "industry_name": "Operations & Management",
        "category": "Talent & People",
        "level": 1,
        "level_label": "Entry Level (0-2 Yrs)",
        "salary_range": {"min": 68000, "median": 82000, "max": 102000},
        "description": "Sources top technical engineering talent, coordinates interviews, manages ATS workflows, and negotiates candidate offers.",
        "core_skills": ["Technical Sourcing (LinkedIn Recruiter)", "Candidate Screening", "ATS (Greenhouse/Lever)", "Offer Closing", "Boolean Search"],
        "advanced_skills": ["Employer Branding", "Compensation Benchmarking", "Diversity Recruiting"],
        "certifications": ["AIRS Certified Internet Recruiter (CIR)"],
        "bridges_to": [
            {"target": "hrbp_lead", "difficulty": 2, "time_months": 14, "transition_label": "HR Business Partner Track"},
            {"target": "operations_mgr", "difficulty": 3, "time_months": 18, "transition_label": "Business Operations Shift"}
        ]
    },
    "scrum_master": {
        "id": "scrum_master",
        "title": "Agile Coach / Scrum Master",
        "industry_id": "operations",
        "industry_name": "Operations & Management",
        "category": "Agile Operations",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 112000, "median": 132000, "max": 158000},
        "description": "Facilitates sprint planning, retrospectives, removes blockers, and guides cross-functional engineering teams in agile practices.",
        "core_skills": ["Scrum & Kanban Ceremonies", "Jira & Confluence Admin", "Sprint Velocity Metrics", "Impediment Removal", "Team Coaching"],
        "advanced_skills": ["Scaled Agile Framework (SAFe)", "DevOps Alignment", "Change Management"],
        "certifications": ["Certified ScrumMaster (CSM)", "PMI-ACP"],
        "bridges_to": [
            {"target": "operations_mgr", "difficulty": 2, "time_months": 16, "transition_label": "Operations Management"}
        ]
    },
    "hrbp_lead": {
        "id": "hrbp_lead",
        "title": "People Operations / HRBP",
        "industry_id": "operations",
        "industry_name": "Operations & Management",
        "category": "Talent & People",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 95000, "median": 114000, "max": 138000},
        "description": "Partners with VP-level executives on organizational design, performance management frameworks, employee relations, and retention.",
        "core_skills": ["Organizational Design", "Employee Relations", "Performance Review Management", "Talent Succession", "HR Policy Design"],
        "advanced_skills": ["Executive Coaching", "M&A People Integration", "DEI Strategy"],
        "certifications": ["SHRM-CP", "PHR (Professional in Human Resources)"],
        "bridges_to": [
            {"target": "operations_mgr", "difficulty": 2, "time_months": 16, "transition_label": "Chief People Officer Track"}
        ]
    },
    "operations_mgr": {
        "id": "operations_mgr",
        "title": "Operations Manager",
        "industry_id": "operations",
        "industry_name": "Operations & Management",
        "category": "Business Operations",
        "level": 4,
        "level_label": "Staff / Lead (8-10 Yrs)",
        "salary_range": {"min": 120000, "median": 155000, "max": 195000},
        "description": "Directs business operations workflows, vendor SLA compliance, internal tooling efficiency, and cross-functional execution.",
        "core_skills": ["Business Process Optimization", "SLA / Vendor Management", "Capacity Planning", "Budget Tracking", "Cross-Functional Execution"],
        "advanced_skills": ["Six Sigma / Lean Operations", "Corporate Expansion Strategy"],
        "certifications": ["Lean Six Sigma Green Belt", "PMP"],
        "bridges_to": []
    },

    # =========================================================================
    # 8. Engineering & Hardware
    # =========================================================================
    "mech_engineer": {
        "id": "mech_engineer",
        "title": "Mechanical Design Engineer",
        "industry_id": "engineering",
        "industry_name": "Engineering & Hardware",
        "category": "Hardware & Systems",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 98000, "median": 118000, "max": 144000},
        "description": "Designs mechanical enclosures, thermal dissipation systems, precision tolerances (GD&T), and prototypes physical assemblies.",
        "core_skills": ["SolidWorks / CAD", "Thermal Simulation (FEA)", "GD&T Standards", "Rapid Prototyping (3D Print)", "DFM / DFA"],
        "advanced_skills": ["Injection Molding Design", "Materials Science", "Shock & Vibration Testing"],
        "certifications": ["Certified SOLIDWORKS Professional (CSWP)"],
        "bridges_to": [
            {"target": "hardware_engineer", "difficulty": 2, "time_months": 14, "transition_label": "Mechatronics Pivot"},
            {"target": "robotics_engineer", "difficulty": 2, "time_months": 16, "transition_label": "Robotics Shift"}
        ]
    },
    "hardware_engineer": {
        "id": "hardware_engineer",
        "title": "Electrical / Hardware Engineer",
        "industry_id": "engineering",
        "industry_name": "Engineering & Hardware",
        "category": "Hardware & Systems",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 115000, "median": 136000, "max": 165000},
        "description": "Designs high-speed printed circuit boards (PCBs), analog & digital circuit schematics, and manages EMC compliance testing.",
        "core_skills": ["PCB Layout (Altium/KiCad)", "Schematic Capture", "Oscilloscopes & Logic Analyzers", "EMC / FCC Testing", "Circuit Simulation (SPICE)"],
        "advanced_skills": ["High-Speed Signal Integrity", "Power Supply Design", "FPGA Interfacing"],
        "certifications": ["IPC Certified IPC Specialist (CIS)"],
        "bridges_to": [
            {"target": "robotics_engineer", "difficulty": 2, "time_months": 14, "transition_label": "Robotics Track"}
        ]
    },
    "robotics_engineer": {
        "id": "robotics_engineer",
        "title": "Robotics Systems Engineer",
        "industry_id": "engineering",
        "industry_name": "Engineering & Hardware",
        "category": "Robotics & Automation",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 124000, "median": 148000, "max": 180000},
        "description": "Programs autonomous motion controllers, robotic manipulators, ROS2 middleware, and multi-sensor fusion algorithms (LiDAR/IMU).",
        "core_skills": ["ROS / ROS2", "Kinematics & Path Planning", "Sensor Fusion (Kalman Filtering)", "C++ / Python", "Motor Actuation Control"],
        "advanced_skills": ["Computer Vision (OpenCV)", "Sim-to-Real Reinforcement Learning", "SLAM Navigation"],
        "certifications": ["ROS Certified Developer"],
        "bridges_to": []
    },

    # =========================================================================
    # 9. Legal & Compliance
    # =========================================================================
    "legal_ops": {
        "id": "legal_ops",
        "title": "Legal Operations Analyst",
        "industry_id": "legal",
        "industry_name": "Legal & Compliance",
        "category": "Legal Operations",
        "level": 1,
        "level_label": "Entry Level (0-2 Yrs)",
        "salary_range": {"min": 74000, "median": 88000, "max": 106000},
        "description": "Administers contract lifecycle management (CLM) platforms, coordinates outside counsel spend, and automates NDA workflows.",
        "core_skills": ["Contract Management (Ironclad)", "Legal Spend Analytics", "e-Discovery Tools", "Document Review", "Workflow Automation"],
        "advanced_skills": ["Legal Tech Integration", "Vendor SLA Auditing"],
        "certifications": ["CLOC (Corporate Legal Operations Consortium) Core Certified"],
        "bridges_to": [
            {"target": "compliance_specialist", "difficulty": 2, "time_months": 14, "transition_label": "Compliance Track"},
            {"target": "privacy_counsel", "difficulty": 3, "time_months": 20, "transition_label": "Privacy Specialization"}
        ]
    },
    "compliance_specialist": {
        "id": "compliance_specialist",
        "title": "Corporate Compliance Specialist",
        "industry_id": "legal",
        "industry_name": "Legal & Compliance",
        "category": "Compliance",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 96000, "median": 116000, "max": 142000},
        "description": "Performs corporate compliance audits, administers anti-money laundering (AML/KYC) controls, and updates regulatory filings.",
        "core_skills": ["Regulatory Auditing", "AML / KYC Frameworks", "Policy Drafting", "Risk Assessment", "Ethics Investigations"],
        "advanced_skills": ["Sanctions Screening", "FCPA Guidelines", "FinCEN Reporting"],
        "certifications": ["Certified Compliance & Ethics Professional (CCEP)", "CAMS"],
        "bridges_to": [
            {"target": "privacy_counsel", "difficulty": 2, "time_months": 16, "transition_label": "Privacy Specialization"}
        ]
    },
    "privacy_counsel": {
        "id": "privacy_counsel",
        "title": "Privacy & Data Governance Counsel",
        "industry_id": "legal",
        "industry_name": "Legal & Compliance",
        "category": "Privacy & Regulatory",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 154000, "median": 182000, "max": 224000},
        "description": "Directs GDPR and CCPA/CPRA data protection compliance, drafts data processing agreements (DPAs), and handles regulatory inquiries.",
        "core_skills": ["GDPR / CCPA / CPRA", "Data Processing Agreements (DPAs)", "Privacy Impact Assessments (PIA)", "Cross-Border Data Transfer", "Incident Notification"],
        "advanced_skills": ["AI Governance Regulations (EU AI Act)", "Litigation Risk Modeling"],
        "certifications": ["CIPP/E (Certified Information Privacy Professional/Europe)", "CIPM"],
        "bridges_to": []
    }
}

# -----------------------------------------------------------------------------
# 3. Dynamic Salary Calibration Helper
# -----------------------------------------------------------------------------
def get_synced_salary_range(role_title: str, level: int, country: str = "us") -> Dict[str, Any]:
    """
    Dynamically synchronizes role compensation against NavigatorService.calculate_role_compensation
    so that the Career Graph always mirrors live market rates and country/tier calibrations.
    """
    tier_key_map = {1: "junior", 2: "mid", 3: "senior", 4: "lead", 5: "director"}
    tier_key = tier_key_map.get(level, "mid")

    try:
        from app.services.navigator_service import NavigatorService
        comp = NavigatorService.calculate_role_compensation(
            role_title=role_title,
            country_code=country,
            experience_level=tier_key
        )
        return {
            "min": comp["p25"],
            "median": comp["median"],
            "max": comp["p75"],
            "p10": comp["p10"],
            "p90": comp["p90"],
            "currency": comp["currency"],
            "currency_symbol": comp["currency_symbol"],
            "monthly_median": comp["monthly_median"],
            "monthly_p25": comp["monthly_p25"],
            "monthly_p75": comp["monthly_p75"]
        }
    except Exception as e:
        logger.warning("Error calculating synced salary for %s in %s: %s", role_title, country, e)
        tier_fallbacks = {
            1: {"min": 65000, "median": 82000, "max": 105000},
            2: {"min": 95000, "median": 120000, "max": 150000},
            3: {"min": 130000, "median": 165000, "max": 205000},
            4: {"min": 175000, "median": 220000, "max": 275000},
            5: {"min": 210000, "median": 265000, "max": 340000},
        }
        fb = tier_fallbacks.get(level, tier_fallbacks[2])
        return {
            "min": fb["min"],
            "median": fb["median"],
            "max": fb["max"],
            "p10": round(fb["min"] * 0.85),
            "p90": round(fb["max"] * 1.15),
            "currency": "USD",
            "currency_symbol": "$",
            "monthly_median": round(fb["median"] / 12),
            "monthly_p25": round(fb["min"] / 12),
            "monthly_p75": round(fb["max"] / 12),
        }


# -----------------------------------------------------------------------------
# 4. Skill Dependency & Category Mappings
# -----------------------------------------------------------------------------
SKILL_CATEGORIES: Dict[str, str] = {
    # Engineering & Cloud
    "HTML5": "Web Technologies",
    "CSS3": "Web Technologies",
    "JavaScript": "Web Technologies",
    "TypeScript": "Web Technologies",
    "React": "Web Technologies",
    "Next.js": "Web Technologies",
    "Tailwind CSS": "Web Technologies",
    "Git": "Developer Tools",
    "Docker": "DevOps & Cloud",
    "Kubernetes": "DevOps & Cloud",
    "Terraform": "DevOps & Cloud",
    "CI/CD": "DevOps & Cloud",
    "CI/CD (GitHub Actions)": "DevOps & Cloud",
    "AWS / GCP": "DevOps & Cloud",
    "Python": "Data Science & AI",
    "Python / Go": "Backend Systems",
    "PostgreSQL": "Database & Storage",
    "SQL (PostgreSQL)": "Database & Storage",
    "Redis": "Database & Storage",
    "Distributed Systems": "System Architecture",
    "System Design": "System Architecture",
    "Event-Driven Architecture": "System Architecture",
    # Data & AI
    "SQL": "Data Science & AI",
    "Scikit-Learn": "Data Science & AI",
    "PyTorch": "Data Science & AI",
    "Pandas & NumPy": "Data Science & AI",
    "Tableau": "Data Science & AI",
    "Power BI": "Data Science & AI",
    "Snowflake / BigQuery": "Data Science & AI",
    "Apache Spark": "Data Science & AI",
    # Product & Management
    "Figma": "Product & Design",
    "PRD Authoring": "Product & Design",
    "Product Discovery": "Product & Design",
    "Agile / Scrum": "Operations & Agile",
    "Scrum & Kanban Ceremonies": "Operations & Agile",
    "People Leadership": "Management & Leadership",
    # Finance
    "Financial Modeling": "Corporate Finance",
    "US GAAP": "Accounting & Controls",
    "M&A Valuation": "Investment Banking",
    "DCF Valuation": "Corporate Finance",
    # Healthcare
    "EHR (Epic/Cerner)": "Healthcare Informatics",
    "HIPAA Compliance": "Healthcare Informatics",
    "CDISC (SDTM/ADaM)": "Clinical Trials",
    # Legal & Compliance
    "GDPR / CCPA / CPRA": "Legal & Compliance",
    "Regulatory Auditing": "Legal & Compliance",
    "Contract Management (Ironclad)": "Legal & Compliance",
}

SKILL_DEPENDENCY_GRAPH: Dict[str, List[str]] = {
    "TypeScript": ["JavaScript"],
    "Next.js": ["React", "JavaScript"],
    "Tailwind CSS": ["CSS3"],
    "Micro-Frontends": ["TypeScript", "React"],
    "PostgreSQL": ["SQL"],
    "Docker": ["Linux Shell"],
    "Kubernetes": ["Docker"],
    "Terraform": ["AWS / GCP", "Cloud Architecture"],
    "Distributed Systems": ["Backend Systems", "PostgreSQL"],
    "Event-Driven Architecture": ["Distributed Systems", "Kafka"],
    "System Design": ["Distributed Systems"],
    "PyTorch": ["Python", "Pandas & NumPy"],
    "Scikit-Learn": ["Python", "SQL"],
    "Machine Learning": ["Python", "Descriptive Statistics"],
    "Apache Spark": ["Python", "SQL"],
    "Design Systems": ["Figma"],
    "DCF Valuation": ["Financial Modeling"],
    "M&A Valuation": ["Financial Modeling"],
    "CDISC (SDTM/ADaM)": ["GCP / FDA Regulations"],
    "GDPR / CCPA / CPRA": ["Policy Drafting"]
}


# -----------------------------------------------------------------------------
# 5. CareerGraphService Implementation
# -----------------------------------------------------------------------------
class CareerGraphService:
    """
    Directed Knowledge Graph engine for cross-industry roles, competencies,
    progression trees, and Dijkstra shortest-path bridging.
    """

    @classmethod
    def get_industries(cls) -> List[Dict[str, str]]:
        return INDUSTRIES

    @classmethod
    def get_full_graph(cls, industry_id: Optional[str] = None, country: str = "us") -> Dict[str, Any]:
        """
        Returns full Directed Career Knowledge Graph with dynamically calibrated
        compensation matching the Live Salary Explorer.
        """
        target_industry = industry_id or "all"
        selected_roles = {}

        for role_id, role in CAREER_ROLES.items():
            if target_industry == "all" or role.get("industry_id") == target_industry:
                selected_roles[role_id] = role

        nodes = []
        edges = []

        for role_id, role in selected_roles.items():
            # Synchronize salary dynamically for the selected country
            synced_salary = get_synced_salary_range(role["title"], role["level"], country=country)

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
                "salary_median": synced_salary["median"],
                "salary_range": synced_salary,
                "currency": synced_salary.get("currency", "USD"),
                "currency_symbol": synced_salary.get("currency_symbol", "$"),
                "description": role["description"],
                "core_skills": role["core_skills"],
                "advanced_skills": role.get("advanced_skills", []),
                "certifications": role.get("certifications", [])
            })

            # Add edges for bridges
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

        categories = sorted(list({n["category"] for n in nodes}))

        from app.services.navigator_service import GLOBAL_COUNTRIES
        c_code = country.lower().strip()
        c_meta = GLOBAL_COUNTRIES.get(c_code, GLOBAL_COUNTRIES["us"])

        return {
            "nodes": nodes,
            "edges": edges,
            "categories": categories,
            "industries": INDUSTRIES,
            "active_industry": target_industry,
            "country": c_code,
            "currency": c_meta["currency"],
            "currency_symbol": c_meta["symbol"]
        }

    @classmethod
    def get_graph_data(cls, industry_id: Optional[str] = None, country: str = "us") -> Dict[str, Any]:
        """Alias for get_full_graph for backward compatibility."""
        return cls.get_full_graph(industry_id, country=country)

    @classmethod
    def find_career_bridge(
        cls,
        current_role_id: str,
        target_role_id: str,
        candidate_skills: Optional[List[str]] = None,
        country: str = "us"
    ) -> Dict[str, Any]:
        """
        Calculates optimal transition path using Dijkstra / BFS shortest path.
        Performs truth-preserving skill gap analysis against candidate skills.
        """
        if current_role_id not in CAREER_ROLES:
            current_role_id = "junior_frontend"
        if target_role_id not in CAREER_ROLES:
            target_role_id = "senior_fullstack"

        # Candidate skills
        raw_candidate = [s.strip() for s in (candidate_skills or []) if s]
        norm_candidate = {s.lower().strip() for s in raw_candidate}
        has_candidate_skills = len(norm_candidate) > 0

        # 1. Dijkstra Pathfinding
        path = cls._dijkstra_shortest_path(current_role_id, target_role_id)
        if not path:
            path = [current_role_id, target_role_id]

        # 2. Extract milestone nodes with synced compensation
        milestones = []
        for r_id in path:
            if r_id in CAREER_ROLES:
                m_role = dict(CAREER_ROLES[r_id])
                m_role["salary_range"] = get_synced_salary_range(m_role["title"], m_role["level"], country=country)
                m_role["salary_median"] = m_role["salary_range"]["median"]
                m_role["currency"] = m_role["salary_range"].get("currency", "USD")
                m_role["currency_symbol"] = m_role["salary_range"].get("currency_symbol", "$")
                milestones.append(m_role)

        # 3. Target role and current role
        target_role = dict(CAREER_ROLES[target_role_id])
        target_role["salary_range"] = get_synced_salary_range(target_role["title"], target_role["level"], country=country)
        target_role["salary_median"] = target_role["salary_range"]["median"]
        target_role["currency"] = target_role["salary_range"].get("currency", "USD")
        target_role["currency_symbol"] = target_role["salary_range"].get("currency_symbol", "$")

        current_role = dict(CAREER_ROLES[current_role_id])
        current_role["salary_range"] = get_synced_salary_range(current_role["title"], current_role["level"], country=country)
        current_role["salary_median"] = current_role["salary_range"]["median"]
        current_role["currency"] = current_role["salary_range"].get("currency", "USD")
        current_role["currency_symbol"] = current_role["salary_range"].get("currency_symbol", "$")

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
                # Partial/transferrable match via dependency tree
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
            feasibility_score = 65

        # Calculate total months
        total_time_months = 0
        for i in range(len(path) - 1):
            src, tgt = path[i], path[i + 1]
            src_role = CAREER_ROLES[src]
            bridge = next((b for b in src_role.get("bridges_to", []) if b["target"] == tgt), None)
            total_time_months += bridge.get("time_months", 12) if bridge else 12

        certs = target_role.get("certifications", [])
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
            "currency": target_role.get("currency", "USD"),
            "currency_symbol": target_role.get("currency_symbol", "$"),
            "salary_delta": target_role["salary_range"]["median"] - current_role["salary_range"]["median"]
        }

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

            for bridge in CAREER_ROLES.get(current, {}).get("bridges_to", []):
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
            for bridge in CAREER_ROLES.get(node, {}).get("bridges_to", []):
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

        # Phase 1: High-leverage transferrable skills
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
