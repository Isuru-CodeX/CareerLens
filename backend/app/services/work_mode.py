"""
Work mode classification service for Career Navigator live job feeds.
Classifies job postings into: 'remote', 'hybrid', 'onsite', or 'unknown'.
"""
import re

_HYBRID = re.compile(r"\b(hybrid|flexible location|partially remote|part-remote)\b", re.I)
_REMOTE = re.compile(r"\b(fully remote|100% remote|work from home|wfh|remote|telecommute|anywhere)\b", re.I)
_NOT_REMOTE = re.compile(r"\b(no|not|non)\s+remote\b", re.I)
_ONSITE = re.compile(r"\b(on-site|onsite|in-office|in office|relocation required)\b", re.I)


def detect_work_mode(text: str | None, remote_flag: bool | None = None) -> str:
    """
    Detects work mode ('remote', 'hybrid', 'onsite', 'unknown') from title, tags, description,
    and optional boolean flags provided by job feeds.
    """
    clean_text = (text or "").strip()
    
    if remote_flag is True:
        # Check if the title explicitly mentions hybrid despite a general remote flag
        if _HYBRID.search(clean_text):
            return "hybrid"
        return "remote"
    
    if not clean_text:
        return "unknown"
        
    if _HYBRID.search(clean_text):
        return "hybrid"
        
    if _NOT_REMOTE.search(clean_text):
        return "onsite"
        
    if _REMOTE.search(clean_text):
        return "remote"
        
    if _ONSITE.search(clean_text):
        return "onsite"
        
    return "onsite"
