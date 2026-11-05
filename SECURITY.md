# CareerLens AI - Security, Privacy & Data Protection Architecture

Resumes and career application records contain sensitive Personally Identifiable Information (PII). CareerLens AI implements strict security and privacy standards to protect user confidentiality.

---

## 1. Threat Model & Mitigations

### 1.1 Multi-Tenant Data Isolation
- **Threat**: Insecure Direct Object Reference (IDOR) attacks where a user accesses another candidate's resume, job matches, or applications.
- **Mitigation**: Every database query explicitly checks ownership on the backend:
  ```python
  resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
  if not resume:
      raise HTTPException(status_code=404, detail="Resume not found.")
  ```
  Client-side UI permissions are backed by strict server-side authorization.

### 1.2 File Upload Validation & Path Traversal Prevention
- **Threat**: Uploading executable payloads, malicious scripts, or path traversal attacks via filenames (e.g. `../../etc/passwd`).
- **Mitigation**:
  1. File extensions are strictly whitelisted (`.pdf`, `.docx`, `.doc`, `.txt`, `.md`).
  2. Maximum upload size is enforced (10MB limit).
  3. Original filenames are never used on the filesystem; files are stored using cryptographically random UUIDs (`uuid.uuid4()`) in a private storage directory outside the public web root.

### 1.3 Credential Storage & Token Security
- **Threat**: Credential leakage and brute-force password cracking.
- **Mitigation**:
  - Passwords are encrypted using salted `bcrypt` with automatic cost-factor scaling. Plaintext passwords are never logged or stored.
  - Authentication tokens use signed JSON Web Tokens (HS256 algorithm) with configurable expiration (`ACCESS_TOKEN_EXPIRE_MINUTES`).

### 1.4 AI Truthfulness & Non-Fabrication
- **Threat**: Generative AI models fabricating credentials, past employers, or fake degrees.
- **Mitigation**:
  - The AI Assistant prompt instructions strictly prohibit inventing qualifications.
  - Cover letters and summary proposals use only user-verified facts from their uploaded resume sections.
  - The UI explicitly mandates user review before exporting or sending generated content.

### 1.5 GDPR & Right to Erasure
- **Data Portability**: Users can download a complete JSON export of all their personal data at any time via `GET /api/users/export`.
- **Permanent Erasure**: Calling `DELETE /api/users/account` permanently deletes the user account, career profile, and physically deletes all uploaded resume files from the server's disk storage.

---

## 2. Environment Variables & Secret Handling

- Secrets are never hard-coded into source repositories.
- Safe templates are provided in `.env.example`.
- Production deployments must generate a cryptographically strong secret:
  ```bash
  python -c "import secrets; print(secrets.token_hex(32))"
  ```

