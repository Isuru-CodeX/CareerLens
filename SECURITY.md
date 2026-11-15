# 🔒 Security Policy

CareerLens AI treats candidate privacy, cryptographic authentication, and zero-PII data protection as foundational tenets.

---

## 🛡️ Supported Versions

We actively provide security patches, dependency audits, and vulnerability fixes for the following versions:

| Version | Supported | Notes |
|:---:|:---:|---|
| **1.0.x** | ✅ Yes | Current active production release with Level-4 RBAC & SQLite WAL |
| **< 1.0.0** | ❌ No | Legacy pre-release prototypes (upgrade recommended) |

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability, privilege escalation vector, or data exposure bug within CareerLens AI, **please do NOT open a public GitHub issue**.

Instead, please submit your findings responsibly:

1. **Email:** Contact the maintainer directly at **[isururathnayaka999@gmail.com](mailto:isururathnayaka999@gmail.com)**.
2. **Subject:** Use the prefix `[SECURITY VULNERABILITY] CareerLens AI - <Summary>`.
3. **Details:** Include:
   * A detailed description of the vulnerability.
   * Reproduction steps or a minimal Proof of Concept (PoC).
   * Potential impact on candidate confidentiality, authentication, or filesystem access.
   * Your preferred credit/attribution name.

### ⏱️ Response & Triage SLA
* **Initial Acknowledgment:** Within **24 to 48 hours**.
* **Triage & Validation:** Within **72 hours**.
* **Patch Release & Advisory:** Critical vulnerabilities are prioritized for hotfix within **5 to 7 business days**.

---

## 📋 Comprehensive Threat Model & GDPR Specifications

For in-depth documentation on our Multi-Tenant Data Isolation, File Upload Validation, Salted Bcrypt Password Hashing, Blind Recruitment Anonymization, and GDPR Article 17 Erasure policies, please read:

👉 **[Detailed Security & Privacy Architecture](docs/SECURITY.md)**
