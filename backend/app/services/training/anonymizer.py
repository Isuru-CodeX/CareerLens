import re
from typing import Tuple

EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
PHONE_REGEX = re.compile(r'(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b')
URL_REGEX = re.compile(r'https?://[^\s<>"]+|www\.[^\s<>"]+')
ADDRESS_REGEX = re.compile(r'\b\d{1,5}\s+([A-Za-z0-9\s.,]+)(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct)\b', re.IGNORECASE)

class AnonymizerService:
    @staticmethod
    def anonymize_text(raw_text: str) -> Tuple[str, dict]:
        """
        Anonymizes personally identifiable information (PII) from CV text
        to comply with GDPR Article 25 (Data Protection by Design) and Article 89
        for model training sets.
        """
        if not raw_text:
            return "", {"emails": 0, "phones": 0, "urls": 0, "addresses": 0}

        masked = raw_text
        stats = {}

        # 1. Emails
        emails = EMAIL_REGEX.findall(masked)
        stats["emails"] = len(emails)
        masked = EMAIL_REGEX.sub("[EMAIL_REDACTED]", masked)

        # 2. URLs
        urls = URL_REGEX.findall(masked)
        stats["urls"] = len(urls)
        masked = URL_REGEX.sub("[URL_REDACTED]", masked)

        # 3. Addresses
        addresses = ADDRESS_REGEX.findall(masked)
        stats["addresses"] = len(addresses)
        masked = ADDRESS_REGEX.sub("[ADDRESS_REDACTED]", masked)

        # 4. Phones
        phones = PHONE_REGEX.findall(masked)
        stats["phones"] = len(phones)
        masked = PHONE_REGEX.sub("[PHONE_REDACTED]", masked)

        # 5. Header Name Masking (first non-empty line if short)
        lines = masked.splitlines()
        for idx, line in enumerate(lines[:5]):
            stripped = line.strip()
            if stripped and len(stripped.split()) <= 4 and not any(kw in stripped.lower() for kw in ["resume", "curriculum", "vitae", "developer", "engineer", "designer", "manager", "summary", "experience"]):
                lines[idx] = "[CANDIDATE_NAME_REDACTED]"
                stats["name_masked"] = True
                break
        masked = "\n".join(lines)

        return masked, stats

