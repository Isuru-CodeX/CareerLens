import ipaddress
import socket
from urllib.parse import urlparse
import httpx
from typing import List, Dict, Any, Tuple

DEFAULT_ALLOWED_DOMAINS = [
    "raw.githubusercontent.com",
    "huggingface.co",
    "kaggle.com",
    "arxiv.org",
    "open-source-resumes.org",
    "storage.googleapis.com",
    "s3.amazonaws.com"
]

def is_ip_private_or_restricted(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
        return (
            ip.is_private or
            ip.is_loopback or
            ip.is_link_local or
            ip.is_reserved or
            ip.is_multicast or
            str(ip).startswith("169.254.") # Cloud metadata (AWS/GCP/Azure)
        )
    except ValueError:
        return True

class SSRFProtectionException(Exception):
    pass

class OnlineImportService:
    @staticmethod
    def validate_url_safety(url: str, allowed_domains: List[str] = None) -> Tuple[bool, str]:
        """
        Validates URL against SSRF vulnerabilities, ensuring target host
        does not resolve to internal network addresses or unauthorized domains.
        """
        try:
            parsed = urlparse(url)
            if parsed.scheme not in ("http", "https"):
                return False, f"Invalid scheme '{parsed.scheme}'. Only HTTP and HTTPS are permitted."

            hostname = parsed.hostname
            if not hostname:
                return False, "Invalid or missing hostname in URL."

            effective_allowed = allowed_domains if allowed_domains is not None else DEFAULT_ALLOWED_DOMAINS
            # Check domain allow-list
            domain_allowed = any(
                hostname == domain or hostname.endswith("." + domain)
                for domain in effective_allowed
            )
            if not domain_allowed:
                return False, f"Domain '{hostname}' is not in the approved Online Import allow-list."

            # DNS resolution and IP safety check
            addr_info = socket.getaddrinfo(hostname, None)
            for item in addr_info:
                ip = item[4][0]
                if is_ip_private_or_restricted(ip):
                    return False, f"SSRF Block: Hostname '{hostname}' resolves to restricted internal IP {ip}."

            return True, "Safe"
        except Exception as e:
            return False, f"URL safety validation failed: {str(e)}"

    @staticmethod
    def fetch_remote_document(url: str, allowed_domains: List[str] = None, max_bytes: int = 10 * 1024 * 1024) -> Tuple[bytes, str]:
        """
        Safely downloads remote document with SSRF guard and size limits.
        """
        is_safe, reason = OnlineImportService.validate_url_safety(url, allowed_domains)
        if not is_safe:
            raise SSRFProtectionException(reason)

        with httpx.Client(timeout=10.0, follow_redirects=False) as client:
            resp = client.get(url, headers={"User-Agent": "CareerLens-AI-Dataset-Collector/2.0"})
            if resp.status_code != 200:
                raise Exception(f"HTTP Error {resp.status_code} fetching remote document.")

            content = resp.content
            if len(content) > max_bytes:
                raise Exception(f"File size exceeds maximum permitted limit ({len(content)} > {max_bytes} bytes).")

            content_type = resp.headers.get("content-type", "application/octet-stream")
            return content, content_type

    @staticmethod
    def generate_synthetic_cvs(roles: List[str], count_per_role: int = 3) -> List[Dict[str, Any]]:
        """
        Generates realistic synthetic CVs with zero personal PII to balance training datasets.
        """
        synthetic_docs = []
        for role in roles:
            for i in range(count_per_role):
                text = f"""[CANDIDATE_NAME_REDACTED]
[EMAIL_REDACTED] | [PHONE_REDACTED] | [URL_REDACTED]

PROFESSIONAL SUMMARY
Results-driven {role} with {3 + i*2}+ years of hands-on experience designing, developing, and deploying resilient software architectures. Proven expertise across modern engineering stacks, automated CI/CD pipelines, and high-performance algorithms.

CORE TECHNICAL SKILLS
Languages & Frameworks: Python, TypeScript, React, FastAPI, Node.js, SQL, Docker, Kubernetes, AWS, Git
Core Competencies: Distributed Systems, REST APIs, Microservices, Unit & Integration Testing, Agile Delivery

PROFESSIONAL EXPERIENCE
Senior {role} | Technology Systems Inc.
2023 - Present
- Architected high-throughput microservices processing over {50 + i*30}M daily requests with 99.99% availability.
- Reduced database query latency by {25 + i*5}% through connection pooling and index optimization.
- Mentored junior engineers and instituted rigorous code review standards.

Software Engineer | NextGen Cloud Solutions
2021 - 2023
- Built resilient data ingestion pipelines using Python, SQLAlchemy, and Redis queues.
- Containerized legacy services with Docker, cutting deployment time from 45 minutes to 4 minutes.

EDUCATION
Bachelor of Science in Computer Science | Accredited University
Graduated Magna Cum Laude
"""
                synthetic_docs.append({
                    "original_filename": f"synthetic_{role.lower().replace(' ', '_')}_{i+1}.txt",
                    "target_role": role,
                    "raw_text": text,
                    "file_type": "txt",
                    "source_type": "synthetic",
                    "source_license": "Public Domain / Synthetic Generation"
                })
        return synthetic_docs

