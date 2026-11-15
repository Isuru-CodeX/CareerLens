# CareerLens AI - Security, Privacy & Data Protection Architecture

Resumes, interview transcripts, and career application records contain sensitive Personally Identifiable Information (PII). CareerLens AI implements defense-in-depth security and privacy standards to protect user confidentiality.

---

## 1. Threat Model & Mitigations

### 1.1 Multi-Tenant Data Isolation
- **Threat**: Insecure Direct Object Reference (IDOR) attacks where a user accesses another candidate's resumes, analyses, or job applications.
- **Mitigation**: Every database query explicitly checks ownership on the backend:
  ```python
  resume = db.query(Resume).filter(
      Resume.id == resume_id,
      Resume.user_id == current_user.id
  ).first()
  if not resume:
      raise HTTPException(status_code=404, detail="Resume not found.")
  ```
  Client-side UI states are backed by strict server-side authorization.

### 1.2 File Upload Validation & Path Traversal Prevention
- **Threat**: Uploading executable payloads, malicious scripts, or path traversal attacks via filenames (e.g. `../../etc/passwd`).
- **Mitigation**:
  1. File extensions are strictly whitelisted (`.pdf`, `.docx`, `.doc`, `.txt`, `.md`).
  2. Maximum upload size is enforced (10MB limit).
  3. Original filenames are never used directly on the filesystem; documents are stored using cryptographically random UUIDs (`uuid.uuid4()`) in a private storage directory outside the public web root.

### 1.3 Credential Storage & Token Security
- **Threat**: Credential leakage and brute-force password cracking.
- **Mitigation**:
  - Passwords are encrypted using salted `bcrypt` with automatic cost-factor scaling. Plaintext passwords are never logged or persisted.
  - Authentication tokens use signed JSON Web Tokens (HS256 algorithm) with configurable expiration (`ACCESS_TOKEN_EXPIRE_MINUTES`).

### 1.4 AI Truthfulness & Non-Fabrication Invariant
- **Threat**: Generative AI models fabricating credentials, past employers, or fake degrees.
- **Mitigation**:
  - System prompts strictly prohibit inventing qualifications or metrics.
  - Resume tailoring engines only re-order and elevate verified bullet points from the candidate's existing portfolio.
  - Cover letters are grounded strictly in user-verified facts.

### 1.5 Blind Recruitment De-Identification (Module 7)
- **Threat**: Demographic bias in early-stage candidate evaluations.
- **Mitigation**:
  - Automated masking engine redacts candidate full names, email addresses, phone numbers, gender pronouns (neutralized to they/them), graduation years, and physical locations.
  - Produces an anonymized candidate alias (`[CANDIDATE_ID_XXXX]`) with an audit log of all redactions applied.

### 1.6 Cryptographic Proof-of-Work Verification (Module 10)
- **Threat**: Fabricated claims of software engineering expertise.
- **Mitigation**:
  - Cross-verifies claimed skills against public GitHub repositories.
  - Generates a tamper-proof SHA-256 verification hash:
    $$\text{BadgeHash} = \text{SHA256}(\text{candidate\_id} + \text{username} + \text{verified\_skills} + \text{timestamp} + \text{salt})$$

### 1.7 Browser Extension Sandboxing (Pillar 4)
- **Threat**: Cross-site scripting or malicious extension data theft.
- **Mitigation**:
  - Built strictly on **Manifest V3** with scoped host permissions (`linkedin.com`, `indeed.com`, `glassdoor.com`, `wellfound.com`).
  - API communication with CareerLens is protected by JWT Bearer tokens stored in browser local storage.

### 1.8 GDPR & Right to Erasure
- **Data Portability**: Users can download a complete JSON archive of all personal data, resumes, analyses, and applications via `GET /api/users/export`.
- **Permanent Erasure**: Calling `DELETE /api/users/account` permanently deletes the user account, profile, database records, and physically deletes all stored resume files from the server's disk storage.

### 1.9 Non-Overwriting Profile Guarantee & Provenance Integrity (Spec 4.1 & 4.2)
- **Zero Silent Overwrites**: Extracted CV contents are never applied directly to user profiles without an explicit side-by-side review screen.
- **Field-Level Provenance (`ProfileFieldSource`)**: Every modified profile attribute maintains cryptographic traceability (`source_document_id`, `source_type`, `confidence`, `confirmed_by_user`).
- **Dispute & Revocation Ledger**: Candidates can flag or remove inaccurate skill inferences (`UserSkillEvidence`). Disputing an evidence item atomically recalculates the parent skill's verification tier and confidence rating.

### 1.10 Strict Zero-PII Policy in Social Profile Skill Extraction
- **Threat**: Ingestion of sensitive personal identifiers (phone numbers, personal emails, physical home addresses, family names) during social profile scraping.
- **Mitigation**:
  - The `SocialSkillExtractorService` applies multi-stage regex blacklisting and canonical taxonomy matching.
  - Rejects any candidate containing `@`, protocols, phone number digit patterns, year/date ranges, or geographical designations.
  - Strictly guarantees that only genuine, human and job-relevant competencies are admitted into candidate profiles.

---

## 2. Environment Variables & Secret Handling

- Secrets are never hard-coded into source repositories.
- Safe templates are provided in `.env.example`.
- Production deployments must generate a cryptographically strong secret:
  ```bash
  python -c "import secrets; print(secrets.token_hex(32))"
  ```
