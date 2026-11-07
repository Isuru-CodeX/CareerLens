"""
backend/app/services/career_graph_service.py - Career Path Knowledge Graph & Skill Navigator Engine.
Models technical roles, competencies, tools, and certifications as a Directed Knowledge Graph.
Implements shortest-path career bridges (BFS / Dijkstra), skill dependency trees, and candidate gap analysis.
"""
from typing import List, Dict, Any, Optional, Set
import heapq
from collections import deque

# Rich Taxonomy of Roles, Skills, and Certifications
CAREER_ROLES: Dict[str, Dict[str, Any]] = {
    "junior_frontend": {
        "id": "junior_frontend",
        "title": "Junior Frontend Developer",
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
            {"target": "sre_lead", "difficulty": 2, "time_months": 14, "transition_label": "Site Reliability Leadership"}
        ]
    },
    "devops_eng": {
        "id": "devops_eng",
        "title": "DevOps & Cloud Platform Engineer",
        "category": "DevOps & Cloud",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 105000, "median": 135000, "max": 165000},
        "description": "Automates cloud environments, maintains CI/CD delivery pipelines, manages container clusters, and enforces infrastructure-as-code.",
        "core_skills": ["Docker", "Kubernetes", "Terraform", "AWS/GCP", "CI/CD (GitHub Actions/GitLab)", "Linux Internals"],
        "advanced_skills": ["Prometheus/Grafana", "Helm", "Security Hardening", "Bash/Python Scripting"],
        "certifications": ["HashiCorp Certified: Terraform Associate", "AWS Solutions Architect - Associate"],
        "bridges_to": [
            {"target": "sre_lead", "difficulty": 3, "time_months": 16, "transition_label": "SRE Specialization"},
            {"target": "cloud_architect", "difficulty": 3, "time_months": 22, "transition_label": "Enterprise Cloud Architecture"},
            {"target": "security_architect", "difficulty": 4, "time_months": 24, "transition_label": "DevSecOps Track"}
        ]
    },
    "sre_lead": {
        "id": "sre_lead",
        "title": "Site Reliability Engineering (SRE) Lead",
        "category": "DevOps & Cloud",
        "level": 3,
        "level_label": "Senior (5-8 Yrs)",
        "salary_range": {"min": 155000, "median": 190000, "max": 235000},
        "description": "Guarantees 99.99% system availability, error budgets, automated self-healing clusters, incident post-mortems, and capacity planning.",
        "core_skills": ["Kubernetes", "Service Mesh (Istio)", "Observability", "Terraform", "Disaster Recovery", "SLI/SLO Engineering"],
        "advanced_skills": ["eBPF Networking", "Multi-Region Active-Active Failover", "Kernel Tuning"],
        "certifications": ["Certified Kubernetes Administrator (CKA)"],
        "bridges_to": [
            {"target": "cloud_architect", "difficulty": 2, "time_months": 14, "transition_label": "Principal Architect"},
            {"target": "engineering_mgr", "difficulty": 3, "time_months": 20, "transition_label": "Infrastructure Director"}
        ]
    },
    "cloud_architect": {
        "id": "cloud_architect",
        "title": "Principal Cloud Solutions Architect",
        "category": "DevOps & Cloud",
        "level": 4,
        "level_label": "Principal / Architect (8+ Yrs)",
        "salary_range": {"min": 190000, "median": 235000, "max": 290000},
        "description": "Designs hybrid-cloud topology, multi-account governance, enterprise security compliance (SOC2/HIPAA), and cost-efficient cloud transformations.",
        "core_skills": ["AWS/GCP/Azure Architecture", "Multi-Tier Networking (VPC/DirectConnect)", "Kubernetes", "FinOps", "Enterprise Identity/IAM"],
        "advanced_skills": ["Zero Trust Architecture", "Global CDN Strategy", "Executive Stakeholder Engagement"],
        "certifications": ["AWS Certified Solutions Architect - Professional", "Google Cloud Professional Cloud Architect"],
        "bridges_to": [
            {"target": "engineering_mgr", "difficulty": 2, "time_months": 16, "transition_label": "VP of Technology / CTO"}
        ]
    },
    "data_analyst": {
        "id": "data_analyst",
        "title": "Data Analyst & Business Intelligence Specialist",
        "category": "Data & AI",
        "level": 1,
        "level_label": "Entry / Mid (1-3 Yrs)",
        "salary_range": {"min": 68000, "median": 85000, "max": 105000},
        "description": "Extracts actionable insights from business datasets, writes complex SQL aggregations, and builds executive BI dashboards.",
        "core_skills": ["SQL", "Python (Pandas/NumPy)", "Tableau / PowerBI", "Statistical Analysis", "Data Storytelling"],
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
        "category": "Data & AI",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 105000, "median": 138000, "max": 170000},
        "description": "Constructs robust, petabyte-scale data pipelines, streaming ingestion, lakehouse architectures, and dimensional modeling.",
        "core_skills": ["Python", "SQL", "Apache Spark", "Airflow / dbt", "Kafka", "Data Lakehouse (Delta/Iceberg)", "Cloud Warehousing"],
        "advanced_skills": ["Distributed Query Optimization", "Data Mesh Governance", "Flink Streaming"],
        "certifications": ["Databricks Certified Data Engineer Associate", "Google Cloud Professional Data Engineer"],
        "bridges_to": [
            {"target": "ml_engineer", "difficulty": 3, "time_months": 16, "transition_label": "MLOps & Feature Store Bridge"},
            {"target": "cloud_architect", "difficulty": 3, "time_months": 22, "transition_label": "Enterprise Data & Cloud Architecture"}
        ]
    },
    "ml_engineer": {
        "id": "ml_engineer",
        "title": "Machine Learning Engineer / MLOps Specialist",
        "category": "Data & AI",
        "level": 3,
        "level_label": "Senior (4-7 Yrs)",
        "salary_range": {"min": 145000, "median": 185000, "max": 235000},
        "description": "Transitions research models into production inference microservices, feature store pipelines, continuous model evaluation, and GPU scaling.",
        "core_skills": ["Python", "PyTorch / TensorFlow", "MLflow / Kubeflow", "Docker / Triton Inference", "Vector Databases", "FastAPI"],
        "advanced_skills": ["LLM Fine-Tuning (LoRA)", "RAG Architecture", "Distributed Model Parallelism"],
        "certifications": ["AWS Certified Machine Learning - Specialty"],
        "bridges_to": [
            {"target": "ai_researcher", "difficulty": 4, "time_months": 24, "transition_label": "Deep AI Research Track"},
            {"target": "lead_fullstack", "difficulty": 3, "time_months": 18, "transition_label": "Full-Stack AI Application Lead"}
        ]
    },
    "ai_researcher": {
        "id": "ai_researcher",
        "title": "Staff AI Research Scientist",
        "category": "Data & AI",
        "level": 4,
        "level_label": "Principal / Staff (7+ Yrs)",
        "salary_range": {"min": 195000, "median": 245000, "max": 310000},
        "description": "Develops novel neural architectures, multimodal vision-language representations, alignment methodologies, and frontier research prototypes.",
        "core_skills": ["Advanced Deep Learning", "Transformer Optimization", "PyTorch", "GPU Cluster Scaling (NCCL)", "Mathematical Modeling"],
        "advanced_skills": ["Reinforcement Learning from Human Feedback (RLHF)", "Diffusion Models", "Quantization"],
        "certifications": [],
        "bridges_to": [
            {"target": "engineering_mgr", "difficulty": 3, "time_months": 18, "transition_label": "Director of AI / Research Leadership"}
        ]
    },
    "security_analyst": {
        "id": "security_analyst",
        "title": "Cybersecurity & AppSec Analyst",
        "category": "Security",
        "level": 2,
        "level_label": "Mid Level (2-5 Yrs)",
        "salary_range": {"min": 95000, "median": 125000, "max": 150000},
        "description": "Audits application vulnerability postures, conducts automated SAST/DAST scans, enforces zero trust identity, and triages threat vectors.",
        "core_skills": ["OWASP Top 10", "Network Security", "Vulnerability Assessment", "OAuth2 / OIDC", "Linux Security", "Python Scripting"],
        "advanced_skills": ["Penetration Testing", "Threat Modeling", "SIEM Tools"],
        "certifications": ["CompTIA Security+", "Certified Ethical Hacker (CEH)"],
        "bridges_to": [
            {"target": "security_architect", "difficulty": 3, "time_months": 20, "transition_label": "Enterprise Security Architect"},
            {"target": "devops_eng", "difficulty": 2, "time_months": 14, "transition_label": "DevSecOps Platform Lead"}
        ]
    },
    "security_architect": {
        "id": "security_architect",
        "title": "Chief Security Architect",
        "category": "Security",
        "level": 4,
        "level_label": "Principal / Architect (8+ Yrs)",
        "salary_range": {"min": 185000, "median": 230000, "max": 285000},
        "description": "Architects enterprise zero-trust postures, cryptography standards, SOC2/ISO27001 regulatory compliance, and incident response matrices.",
        "core_skills": ["Zero Trust Architecture", "Cryptographic Protocols", "Cloud Security (AWS/GCP IAM)", "Threat Modeling", "Governance & Risk"],
        "advanced_skills": ["Board-Level Threat Briefings", "Automated Policy Enforcement (OPA)"],
        "certifications": ["CISSP - Certified Information Systems Security Professional"],
        "bridges_to": [
            {"target": "engineering_mgr", "difficulty": 2, "time_months": 16, "transition_label": "CISO / Executive Leadership"}
        ]
    },
    "engineering_mgr": {
        "id": "engineering_mgr",
        "title": "Engineering Manager / Director",
        "category": "Management",
        "level": 4,
        "level_label": "Leadership (8+ Yrs)",
        "salary_range": {"min": 180000, "median": 230000, "max": 290000},
        "description": "Oversees high-performing engineering squads, quarterly roadmaps, budget allocation, hiring strategy, career development, and delivery velocity.",
        "core_skills": ["Team Leadership", "Agile / Scrum / Kanban", "Engineering Metrics (DORA)", "System Architecture Oversight", "Hiring & Mentorship"],
        "advanced_skills": ["Cross-Functional Alignment", "Budget Management", "Conflict Mediation"],
        "certifications": ["Certified ScrumMaster (CSM)", "PMP"],
        "bridges_to": []
    }
}

# Skill Dependencies & Synergy Trees
SKILL_DEPENDENCY_GRAPH: Dict[str, List[str]] = {
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
    "Distributed Consensus (Raft/Paxos)": ["Distributed Systems", "Concurrent Programming"]
}

SKILL_CATEGORIES: Dict[str, str] = {
    "React": "Frontend", "TypeScript": "Frontend", "Next.js": "Frontend", "HTML5": "Frontend", "CSS3": "Frontend", "Tailwind CSS": "Frontend", "Micro-Frontends": "Frontend", "Design Systems": "Frontend",
    "Node.js": "Backend", "Python": "Backend", "FastAPI": "Backend", "Go/Java": "Backend", "Golang/Rust/Java": "Backend", "PostgreSQL": "Backend", "Redis": "Backend", "REST APIs": "Backend", "gRPC": "Backend", "Distributed Systems": "Backend", "Kafka": "Backend", "Kafka/Pulsar": "Backend",
    "Docker": "DevOps & Cloud", "Kubernetes": "DevOps & Cloud", "Terraform": "DevOps & Cloud", "AWS/GCP": "DevOps & Cloud", "CI/CD": "DevOps & Cloud", "Linux Internals": "DevOps & Cloud", "Observability": "DevOps & Cloud",
    "SQL": "Data & AI", "Apache Spark": "Data & AI", "Airflow / dbt": "Data & AI", "PyTorch": "Data & AI", "Vector Databases": "Data & AI", "RAG Architecture": "Data & AI", "MLflow / Kubeflow": "Data & AI",
    "OWASP Top 10": "Security", "Zero Trust Architecture": "Security", "OAuth2 / OIDC": "Security"
}


class CareerGraphService:
    @classmethod
    def get_full_graph(cls) -> Dict[str, Any]:
        """
        Returns full nodes and edges representation for client-side rendering (D3.js / React Flow / SVG).
        """
        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []

        # Add Role Nodes
        for role_id, role in CAREER_ROLES.items():
            nodes.append({
                "id": role_id,
                "title": role["title"],
                "label": role["title"],
                "type": "role",
                "category": role["category"],
                "level": role["level"],
                "level_label": role["level_label"],
                "salary_median": role["salary_range"]["median"],
                "salary_range": role["salary_range"],
                "description": role["description"],
                "core_skills": role["core_skills"],
                "advanced_skills": role["advanced_skills"],
                "certifications": role["certifications"]
            })

            # Add Role-to-Role Progression Edges
            for bridge in role.get("bridges_to", []):
                edges.append({
                    "id": f"bridge_{role_id}_{bridge['target']}",
                    "source": role_id,
                    "target": bridge["target"],
                    "type": "BRIDGES_TO",
                    "difficulty": bridge.get("difficulty", 2),
                    "time_months": bridge.get("time_months", 12),
                    "label": bridge.get("transition_label", "Promotion / Transition")
                })

        return {
            "nodes": nodes,
            "edges": edges,
            "categories": ["Frontend", "Full Stack", "Backend", "DevOps & Cloud", "Data & AI", "Security", "Management"]
        }

    @classmethod
    def find_career_bridge(
        cls,
        current_role_id: str,
        target_role_id: str,
        candidate_skills: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Calculates the optimal transition path between current and target roles using BFS/Dijkstra shortest path.
        Identifies verified, transferrable, and missing prerequisite skills.
        """
        if current_role_id not in CAREER_ROLES:
            current_role_id = "junior_frontend"
        if target_role_id not in CAREER_ROLES:
            target_role_id = "senior_fullstack"

        # Normalized candidate skill set
        norm_candidate = {s.lower().strip() for s in (candidate_skills or []) if s}

        # 1. Pathfinding (BFS with weighted time/difficulty)
        path = cls._dijkstra_shortest_path(current_role_id, target_role_id)
        if not path:
            path = [current_role_id, target_role_id]

        # 2. Extract milestone nodes
        milestones = [CAREER_ROLES[r_id] for r_id in path]

        # 3. Aggregate all skills required across the path
        target_role = CAREER_ROLES[target_role_id]
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
                    "category": SKILL_CATEGORIES.get(skill, "General"),
                    "status": "verified",
                    "importance": "core" if skill in required_core else "advanced"
                })
            else:
                # Check for partial/transferrable match via dependencies
                prereqs = SKILL_DEPENDENCY_GRAPH.get(skill, [])
                has_prereq = any(p.lower() in norm_candidate for p in prereqs)
                if has_prereq:
                    transferrable_skills.append({
                        "name": skill,
                        "category": SKILL_CATEGORIES.get(skill, "General"),
                        "status": "transferrable",
                        "importance": "core" if skill in required_core else "advanced",
                        "transferrable_reason": f"Foundation skills detected ({', '.join(prereqs)})"
                    })
                else:
                    missing_skills.append({
                        "name": skill,
                        "category": SKILL_CATEGORIES.get(skill, "General"),
                        "status": "missing",
                        "importance": "core" if skill in required_core else "advanced",
                        "prerequisites": prereqs
                    })

        # Calculate Feasibility Score
        total_skills_count = max(1, len(all_target_skills))
        score = int(((len(verified_skills) * 1.0) + (len(transferrable_skills) * 0.55)) / total_skills_count * 100)
        feasibility_score = max(15, min(98, score))

        # Estimate total transition timeline
        total_time_months = 0
        for i in range(len(path) - 1):
            src, tgt = path[i], path[i+1]
            src_role = CAREER_ROLES[src]
            bridge = next((b for b in src_role.get("bridges_to", []) if b["target"] == tgt), None)
            total_time_months += bridge.get("time_months", 12) if bridge else 12

        # Recommended Certifications
        certs = target_role.get("certifications", [])

        # Curated Learning Milestones
        learning_steps = cls._generate_learning_roadmap(missing_skills, transferrable_skills)

        return {
            "path_found": True,
            "path": path,
            "path_role_ids": path,
            "current_role": CAREER_ROLES[current_role_id],
            "target_role": target_role,
            "milestones": milestones,
            "total_estimated_months": total_time_months,
            "total_transition_months": total_time_months,
            "feasibility_score": feasibility_score,
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
            "salary_delta": target_role["salary_range"]["median"] - CAREER_ROLES[current_role_id]["salary_range"]["median"]
        }

    @classmethod
    def get_graph_data(cls) -> Dict[str, Any]:
        """Alias for get_full_graph."""
        return cls.get_full_graph()

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

        # Fallback to BFS if Dijkstra finds no directed edge
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
        transferrable: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        steps: List[Dict[str, Any]] = []
        phase_idx = 1

        # Phase 1: High-leverage transferrable skills (fastest ROI)
        if transferrable:
            steps.append({
                "phase": f"Phase {phase_idx}: Upgrade Transferrable Skills",
                "duration_weeks": "4 - 8 Weeks",
                "focus": "Leverage existing foundations to quickly bridge adjacent requirements.",
                "skills": [s["name"] for s in transferrable[:3]],
                "recommended_project": "Build an end-to-end milestone feature using your primary language with the transferrable technology integrated."
            })
            phase_idx += 1

        # Phase 2: Core missing prerequisites
        core_missing = [s["name"] for s in missing if s.get("importance") == "core"]
        if core_missing:
            steps.append({
                "phase": f"Phase {phase_idx}: Master Core Prerequisite Gaps",
                "duration_weeks": "8 - 14 Weeks",
                "focus": "Close critical architectural and technical skill gaps required for this role.",
                "skills": core_missing[:4],
                "recommended_project": "Architect a production-grade distributed microservice or interactive SPA incorporating these core tools."
            })
            phase_idx += 1

        # Phase 3: Advanced & Certification Capstone
        adv_missing = [s["name"] for s in missing if s.get("importance") == "advanced"]
        if adv_missing or phase_idx <= 2:
            steps.append({
                "phase": f"Phase {phase_idx}: Advanced Specialization & Proof of Work",
                "duration_weeks": "6 - 10 Weeks",
                "focus": "Demonstrate senior-level architectural thinking, observability, and cloud scalability.",
                "skills": adv_missing[:3] or ["System Design", "Cloud Observability", "CI/CD Automation"],
                "recommended_project": "Deploy an open-source reference implementation with live monitoring, automated tests, and comprehensive documentation."
            })

        return steps
