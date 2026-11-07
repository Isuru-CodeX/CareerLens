"""
Base dataclass and contract for live job market feed adapters.
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class RawJob:
    source: str
    external_id: str
    title: str
    company: str
    location: str
    work_mode: str  # remote | hybrid | onsite | unknown
    url: str
    description: str = ""
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: Optional[str] = "USD"
    period: str = "year"  # year | month | hour
    estimated: bool = False  # True when the API guessed the salary
    posted_at: Optional[datetime] = None

