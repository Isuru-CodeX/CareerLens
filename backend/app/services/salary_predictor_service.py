"""
backend/app/services/salary_predictor_service.py - Market Salary Predictor & Offer Negotiation Coach Engine.
Implements compensation regression estimates, percentile compensation bands (25th, 50th, 75th, 90th),
skill ROI multipliers, interactive game-theory negotiation simulator, and battle-tested counter-offer scripts.
"""
import re
import math
import logging
from typing import Dict, Any, List, Optional
from app.services.llm_client import LLMClient
from app.services.career_graph_service import CareerGraphService, CAREER_ROLES

logger = logging.getLogger("careerlens.salary_predictor")

# Location Cost of Living & Tech Market Multipliers
LOCATION_TIERS: Dict[str, Dict[str, Any]] = {
    "us_tier1": {
        "id": "us_tier1",
        "label": "US Tier 1 (SF Bay Area, NYC, Seattle)",
        "multiplier": 1.0,
        "currency": "USD",
        "symbol": "$",
        "description": "Benchmark tech hubs with highest market density and venture capital."
    },
    "us_tier2": {
        "id": "us_tier2",
        "label": "US Tier 2 (Austin, Boston, Denver, Chicago, LA)",
        "multiplier": 0.88,
        "currency": "USD",
        "symbol": "$",
        "description": "Established technology hubs with competitive compensation."
    },
    "uk_europe": {
        "id": "uk_europe",
        "label": "UK & Western Europe (London, Berlin, Amsterdam)",
        "multiplier": 0.76,
        "currency": "USD",
        "symbol": "$",
        "description": "European tech centers with strong statutory benefits and pension matching."
    },
    "canada_aus": {
        "id": "canada_aus",
        "label": "Canada & Australia (Toronto, Vancouver, Sydney)",
        "multiplier": 0.80,
        "currency": "USD",
        "symbol": "$",
        "description": "Commonwealth tech markets with steady enterprise hiring."
    },
    "remote_global": {
        "id": "remote_global",
        "label": "Global Remote / APAC / Latin America",
        "multiplier": 0.65,
        "currency": "USD",
        "symbol": "$",
        "description": "Distributed remote compensation adjusted for international purchasing power."
    }
}

# Company Tier Multipliers & Equity Allocations
COMPANY_TIERS: Dict[str, Dict[str, Any]] = {
    "early_startup": {
        "id": "early_startup",
        "label": "Early Stage Startup (Seed - Series A)",
        "base_mult": 0.90,
        "bonus_pct": 0.05,
        "equity_mult": 1.6,
        "description": "Higher equity upside, lower immediate cash liquidity."
    },
    "growth_scaleup": {
        "id": "growth_scaleup",
        "label": "Growth Stage (Series B - Pre-IPO)",
        "base_mult": 1.0,
        "bonus_pct": 0.10,
        "equity_mult": 1.1,
        "description": "Balanced market cash with liquid or secondary-eligible equity."
    },
    "enterprise_faang": {
        "id": "enterprise_faang",
        "label": "Public Enterprise / Big Tech / FAANG",
        "base_mult": 1.18,
        "bonus_pct": 0.18,
        "equity_mult": 1.45,
        "description": "Top-of-market guaranteed base, performance bonuses, and publicly-traded RSUs."
    }
}

# High-ROI Technical Skill Multipliers (Additive % to baseline market value)
SKILL_ROI_REGISTRY: Dict[str, Dict[str, Any]] = {
    "kubernetes": {"name": "Kubernetes", "bonus_pct": 0.08, "category": "Cloud & Infrastructure"},
    "distributed systems": {"name": "Distributed Systems", "bonus_pct": 0.10, "category": "Architecture"},
    "system design": {"name": "System Design", "bonus_pct": 0.09, "category": "Architecture"},
    "pytorch": {"name": "PyTorch / Deep Learning", "bonus_pct": 0.12, "category": "AI / ML"},
    "tensorflow": {"name": "TensorFlow", "bonus_pct": 0.09, "category": "AI / ML"},
    "llm": {"name": "LLMs & GenAI", "bonus_pct": 0.14, "category": "AI / ML"},
    "kafka": {"name": "Apache Kafka", "bonus_pct": 0.07, "category": "Backend"},
    "aws": {"name": "AWS Cloud Architecture", "bonus_pct": 0.07, "category": "Cloud"},
    "go": {"name": "Golang", "bonus_pct": 0.08, "category": "Languages"},
    "rust": {"name": "Rust Systems Programming", "bonus_pct": 0.11, "category": "Languages"},
    "security": {"name": "Cybersecurity / DevSecOps", "bonus_pct": 0.10, "category": "Security"},
    "graphql": {"name": "GraphQL API Federation", "bonus_pct": 0.05, "category": "Full Stack"},
    "microservices": {"name": "Microservices", "bonus_pct": 0.06, "category": "Backend"},
    "ci/cd": {"name": "CI/CD & DevOps Automation", "bonus_pct": 0.05, "category": "DevOps"},
    "react": {"name": "React & Modern UI", "bonus_pct": 0.04, "category": "Frontend"},
    "next.js": {"name": "Next.js & SSR", "bonus_pct": 0.05, "category": "Frontend"},
    "postgresql": {"name": "PostgreSQL Optimization", "bonus_pct": 0.05, "category": "Database"},
    "redis": {"name": "Redis In-Memory Caching", "bonus_pct": 0.05, "category": "Database"}
}


class SalaryPredictorService:
    @staticmethod
    def _find_matching_role(role_query: str) -> Dict[str, Any]:
        """
        Finds the closest canonical career role from the taxonomy, or constructs a reasonable fallback.
        """
        q = (role_query or "").lower().strip()
        for role_id, role in CAREER_ROLES.items():
            if role_id == q or role["title"].lower() in q or q in role["title"].lower():
                return role
        # Fuzzy keyword matching
        if "lead" in q or "staff" in q or "principal" in q:
            return CAREER_ROLES.get("lead_fullstack", CAREER_ROLES["senior_fullstack"])
        if "data" in q or "ai" in q or "machine" in q:
            return CAREER_ROLES.get("machine_learning_eng", CAREER_ROLES["backend_dev"])
        if "devops" in q or "cloud" in q or "sre" in q:
            return CAREER_ROLES.get("devops_eng", CAREER_ROLES["backend_dev"])
        if "security" in q:
            return CAREER_ROLES.get("security_eng", CAREER_ROLES["backend_dev"])
        if "front" in q or "react" in q or "ui" in q:
            return CAREER_ROLES.get("mid_frontend", CAREER_ROLES["fullstack_dev"])
        if "manager" in q or "director" in q:
            return CAREER_ROLES.get("engineering_mgr", CAREER_ROLES["lead_fullstack"])
        
        # Default fallback to Full Stack Engineer
        return CAREER_ROLES["fullstack_dev"]

    @classmethod
    def predict_compensation(
        cls,
        role_title: str,
        experience_years: float = 3.0,
        skills: Optional[List[str]] = None,
        location_tier: str = "us_tier1",
        company_tier: str = "growth_scaleup"
    ) -> Dict[str, Any]:
        """
        Computes calibrated 25th, 50th, 75th, and 90th percentile compensation packages.
        Incorporates experience tenure curves, location multipliers, company sizing, and skill ROI premiums.
        """
        role = cls._find_matching_role(role_title)
        loc = LOCATION_TIERS.get(location_tier, LOCATION_TIERS["us_tier1"])
        comp = COMPANY_TIERS.get(company_tier, COMPANY_TIERS["growth_scaleup"])

        base_min = role["salary_range"]["min"]
        base_median = role["salary_range"]["median"]
        base_max = role["salary_range"]["max"]

        # Experience tenure curve: Non-linear logarithmic scaling
        # Level 1 expects ~1yr, Level 2 ~3.5yr, Level 3 ~6.5yr, Level 4 ~9yr
        expected_level_exp = {1: 1.0, 2: 3.5, 3: 6.5, 4: 9.0}.get(role.get("level", 2), 3.5)
        exp_diff = experience_years - expected_level_exp
        exp_mult = 1.0 + (math.atan(exp_diff / 4.0) * 0.18)

        # Skill ROI multipliers
        candidate_skills = [s.lower().strip() for s in (skills or [])]
        matched_roi_skills: List[Dict[str, Any]] = []
        total_skill_bonus = 0.0

        for skill_key, skill_info in SKILL_ROI_REGISTRY.items():
            if any(skill_key in cs or cs in skill_key for cs in candidate_skills):
                bonus = skill_info["bonus_pct"]
                matched_roi_skills.append({
                    "skill": skill_info["name"],
                    "category": skill_info["category"],
                    "bonus_pct": round(bonus * 100, 1),
                    "estimated_annual_lift": round(base_median * bonus)
                })
                total_skill_bonus += bonus

        # Cap skill premium at +32% to prevent unrealistic runaway inflation
        total_skill_bonus = min(0.32, total_skill_bonus)
        skill_mult = 1.0 + total_skill_bonus

        # Final Base Salary Percentiles (calibrated to location and company tier)
        overall_mult = loc["multiplier"] * comp["base_mult"] * exp_mult * skill_mult

        p25 = round(base_min * overall_mult / 1000) * 1000
        p50 = round(base_median * overall_mult / 1000) * 1000
        p75 = round(((base_median + base_max) / 2) * overall_mult / 1000) * 1000
        p90 = round(base_max * overall_mult * 1.08 / 1000) * 1000

        # Annual bonus & Equity grants
        bonus_pct = comp["bonus_pct"]
        est_annual_bonus = round(p50 * bonus_pct)

        # Equity calculation (estimated annual vesting value)
        base_equity_grant = {
            1: 8000,
            2: 22000,
            3: 45000,
            4: 85000
        }.get(role.get("level", 2), 22000)
        est_annual_equity = round(base_equity_grant * comp["equity_mult"] * loc["multiplier"] / 1000) * 1000

        total_target_comp = p50 + est_annual_bonus + est_annual_equity

        # Market leverage rating
        if total_skill_bonus > 0.18 or experience_years >= 6:
            leverage_sentiment = "Strong Candidate Advantage (High Scarcity)"
            market_tag = "Seller's Market"
        elif total_skill_bonus > 0.08:
            leverage_sentiment = "Competitive Position (Healthy Demand)"
            market_tag = "Balanced Market"
        else:
            leverage_sentiment = "Baseline Market Standard"
            market_tag = "Standard Market"

        return {
            "role_title": role["title"],
            "role_category": role["category"],
            "experience_years": experience_years,
            "location_tier": loc["label"],
            "company_tier": comp["label"],
            "currency": loc["currency"],
            "symbol": loc["symbol"],
            "percentiles": {
                "p25": p25,
                "p50": p50,  # Median benchmark
                "p75": p75,  # Top quartile
                "p90": p90   # Staff/Principal outlier
            },
            "compensation_breakdown": {
                "base_salary": p50,
                "annual_bonus": est_annual_bonus,
                "bonus_percentage": round(bonus_pct * 100, 1),
                "annual_equity": est_annual_equity,
                "total_target_compensation": total_target_comp
            },
            "skill_roi_boosters": sorted(matched_roi_skills, key=lambda x: x["bonus_pct"], reverse=True),
            "total_skill_premium_pct": round(total_skill_bonus * 100, 1),
            "market_sentiment": leverage_sentiment,
            "market_tag": market_tag,
            "suggested_negotiation_anchor": round(p75 * 1.05 / 1000) * 1000
        }

    @classmethod
    def evaluate_negotiation_turn(
        cls,
        role_title: str,
        current_offer: float,
        target_salary: float,
        candidate_pitch: str,
        turn_no: int = 1,
        history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Interactive game-theory roleplay simulator.
        Evaluates candidate negotiation response, calculates leverage, firmness vs. politeness metrics,
        and generates a realistic HR recruiter counter-response with actionable coach feedback.
        """
        pitch = candidate_pitch.strip()
        offer = float(current_offer or 120000)
        target = float(target_salary or 140000)
        gap = max(0.0, target - offer)
        gap_pct = (gap / offer) * 100 if offer > 0 else 15.0

        # Heuristic detection for game-theory evaluation
        pitch_lower = pitch.lower()

        # 1. Competing Offer Mention (+25 leverage)
        has_competing_offer = any(w in pitch_lower for w in [
            "competing offer", "other offer", "another process", "final rounds", "actively interviewing",
            "evaluating multiple offers", "another company"
        ])

        # 2. Market Data Anchor (+20 leverage)
        has_market_data = any(w in pitch_lower for w in [
            "market rate", "industry data", "market standard", "levels.fyi", "compensation benchmarks",
            "median", "75th percentile", "fair market"
        ])

        # 3. High-Impact Value & ROI Framing (+20 leverage)
        has_value_framing = any(w in pitch_lower for w in [
            "revenue", "latency", "scale", "delivered", "architecture", "lead", "business impact",
            "cross-functional", "deliver results", "production systems", "immediate impact"
        ])

        # 4. Flexibility & Total Comp Compromise (+15 tactical politeness)
        has_total_comp_flex = any(w in pitch_lower for w in [
            "sign-on", "signing bonus", "equity", "rsus", "stock options", "performance bonus",
            "total compensation", "accelerated review", "milestone"
        ])

        # 5. Politeness vs Firmness Score
        polite_terms = len(re.findall(r"\b(thank you|appreciate|excited|thrilled|love to join|collaborative|understand|respect)\b", pitch_lower))
        firm_terms = len(re.findall(r"\b(target|expect|seeking|align|require|necessary|minimum|anchor|firm)\b", pitch_lower))

        # Balanced politeness is 2-4 polite phrases; firmness 1-3 terms
        firmness_score = min(100, int((firm_terms / 3.0) * 100))
        politeness_score = min(100, int((polite_terms / 4.0) * 100))

        # Overall Game-Theory Leverage Score (0-100)
        leverage_score = 40  # Baseline
        if has_competing_offer:
            leverage_score += 25
        if has_market_data:
            leverage_score += 15
        if has_value_framing:
            leverage_score += 15
        if has_total_comp_flex:
            leverage_score += 10
        if len(pitch.split()) < 15:
            leverage_score -= 20  # Too brief / ungrounded

        leverage_score = max(20, min(95, leverage_score))

        # Recruiter Acceptance Probability
        # If gap is reasonable (<15%) and leverage is high, acceptance is very high
        gap_penalty = min(40, int(gap_pct * 1.5))
        acceptance_prob = max(15, min(92, leverage_score - gap_penalty + 15))

        # LLM Generated Dialogue with curated deterministic fallback
        client = LLMClient()
        recruiter_reply = ""
        coach_critique = ""

        if client.available:
            history_prompt = ""
            if history:
                history_prompt = "Dialogue history:\n" + "\n".join([
                    f"Turn {h.get('turn')}: Candidate said: '{h.get('candidate_pitch')}'\nRecruiter replied: '{h.get('recruiter_reply')}'"
                    for h in history
                ])

            prompt = (
                f"You are a Senior Corporate Technical Recruiter conducting a live salary negotiation for a {role_title} role.\n"
                f"Initial Offer: ${offer:,.0f}. Candidate Target: ${target:,.0f} (Gap: {gap_pct:.1f}%).\n"
                f"Current Turn: {turn_no}.\n"
                f"{history_prompt}\n"
                f"Candidate just said: '{pitch}'\n\n"
                f"Evaluate this response. Formulate a realistic, professional Recruiter response and a brief Coach critique.\n"
                f"If candidate presented good leverage (competing offers, market benchmarks, flexibility), make a partial concession\n"
                f"(e.g. increase base by 40-70% of gap, or offer a sign-on bonus).\n"
                f"Provide JSON with keys: recruiter_reply, coach_critique, concession_amount_usd, recruiter_sentiment (favorable|neutral|firm)."
            )
            data = client.generate_json(prompt)
            if data and data.get("recruiter_reply"):
                recruiter_reply = data["recruiter_reply"]
                coach_critique = data.get("coach_critique", "")
                concession = float(data.get("concession_amount_usd", gap * 0.45))
            else:
                concession = gap * (leverage_score / 140.0)
        else:
            concession = gap * (leverage_score / 140.0)

        # Fallback realistic recruiter dialogue
        if not recruiter_reply:
            if leverage_score >= 75:
                concession = min(gap, round(gap * 0.70 / 1000) * 1000)
                recruiter_reply = (
                    f"Thank you for being transparent about your market expectations and current search status. "
                    f"The hiring team was very impressed by your architecture background and immediate domain fit. "
                    f"While our standard engineering salary band caps out closer to ${offer + concession:,.0f}, "
                    f"I spoke directly with the VP of Engineering, and we can adjust the base offer up to ${offer + concession:,.0f}, "
                    f"plus an additional ${min(20000, round(gap * 0.4 / 1000) * 1000):,.0f} sign-on bonus to bridge the gap. "
                    f"Would this allow you to comfortably accept our offer and start next month?"
                )
                coach_critique = (
                    "Outstanding execution. Framing your request with specific market anchors and competing leverage "
                    "prompted the recruiter to immediately seek an executive exception and offer a sign-on bridge."
                )
            elif leverage_score >= 50:
                concession = min(gap, round(gap * 0.40 / 1000) * 1000)
                recruiter_reply = (
                    f"I appreciate you sharing those details with me. We are very eager to have you join our team. "
                    f"Our compensation bands are tied to internal equity among our current team, but I can meet you partway: "
                    f"we can increase the base salary to ${offer + concession:,.0f}, and I can also look into adding extra equity shares. "
                    f"How does that sound to you?"
                )
                coach_critique = (
                    "Solid progress. You secured a partial concession. In your next message, consider asking whether the remaining difference "
                    "can be structured as a first-year sign-on bonus or tied to an accelerated 6-month performance review."
                )
            else:
                concession = min(gap, round(gap * 0.15 / 1000) * 1000)
                recruiter_reply = (
                    f"We certainly understand where you are coming from. However, our initial offer of ${offer:,.0f} was carefully "
                    f"benchmarked to our team parity and candidate experience level. At most, we could potentially stretch to "
                    f"${offer + concession:,.0f}. We do offer comprehensive health benefits, learning stipends, and an annual bonus plan."
                )
                coach_critique = (
                    "The counter-offer lacked tangible market citations or business value proof points, leading the recruiter to hold their ground. "
                    "Next time, explicitly reference industry benchmark percentiles and specific high-impact systems you will drive."
                )

        new_offer = offer + concession

        return {
            "turn_no": turn_no,
            "candidate_pitch": pitch,
            "metrics": {
                "leverage_score": leverage_score,
                "acceptance_probability": acceptance_prob,
                "firmness_index": firmness_score,
                "politeness_index": politeness_score,
                "tactical_balance": "Optimal (Collaborative & Firm)" if 40 <= firmness_score <= 85 and politeness_score >= 35 else "Needs Firmer Anchoring"
            },
            "signals_detected": {
                "competing_offer": has_competing_offer,
                "market_data_anchor": has_market_data,
                "value_framing": has_value_framing,
                "total_comp_flexibility": has_total_comp_flex
            },
            "financial_outcome": {
                "initial_offer": offer,
                "new_offer": new_offer,
                "concession_amount": concession,
                "gap_remaining": max(0.0, target - new_offer)
            },
            "recruiter_reply": recruiter_reply,
            "coach_critique": coach_critique,
            "suggested_next_move": (
                "If acceptable, verbally confirm and request updated written offer letter."
                if acceptance_prob >= 75
                else "Pivot to non-base compensation: ask for an accelerated 6-month performance salary review or a signing bonus."
            )
        }

    @classmethod
    def generate_counter_offer_scripts(
        cls,
        role_title: str,
        company: str,
        current_offer: float,
        target_salary: float,
        highlight_skill: Optional[str] = "Distributed Systems & Cloud Architecture"
    ) -> List[Dict[str, Any]]:
        """
        Generates 5 battle-tested, structured counter-offer templates ready to copy and send.
        """
        role = role_title or "Senior Engineer"
        comp = company or "the company"
        offer = float(current_offer or 120000)
        target = float(target_salary or 140000)
        skill = highlight_skill or "scalable system architecture"

        scripts = [
            {
                "id": "market_anchor",
                "title": "Strategy 1: Market Data & Specialization Anchor",
                "tag": "Most Popular",
                "badge": "High Success Rate",
                "description": "Anchors firmly on verified 75th-percentile market benchmarks and your specific high-ROI technical competencies.",
                "script": (
                    f"Dear [Hiring Manager / Recruiter Name],\n\n"
                    f"Thank you so much for extending the offer to join {comp} as a {role}. "
                    f"I am genuinely thrilled about the team's mission, the engineering roadmap, and the opportunity to contribute immediately.\n\n"
                    f"Based on my industry market research for senior engineering roles in our region—as well as my hands-on track record "
                    f"delivering high-throughput systems, optimizing database latency, and driving {skill}—a base salary closer to "
                    f"${target:,.0f} reflects the market value for this level of responsibility.\n\n"
                    f"If we are able to reach ${target:,.0f} in base compensation, I would be delighted to sign the agreement right away "
                    f"and decline other active processes. Thank you again for your partnership, and I look forward to your thoughts!"
                )
            },
            {
                "id": "competing_offer",
                "title": "Strategy 2: Competing Offer Alignment",
                "tag": "Maximum Leverage",
                "badge": "High Impact",
                "description": "Uses polite, professional timeline urgency and competing employer offers to motivate a rapid compensation increase.",
                "script": (
                    f"Dear [Recruiter Name],\n\n"
                    f"Thank you again for the formal offer to join {comp}. I have thoroughly enjoyed meeting the engineering team and "
                    f"strongly prefer {comp}'s culture and technical challenges over the other opportunities I am currently considering.\n\n"
                    f"To be completely transparent, I have received a competing written offer at ${target:,.0f} in total annual compensation. "
                    f"Because {comp} remains my top choice, if you are able to adjust our base salary to ${target:,.0f} (or bridge the difference "
                    f"through a signing bonus), I am ready to withdraw from all other interview processes and accept today.\n\n"
                    f"Please let me know if this adjustment is possible within your team's budget!"
                )
            },
            {
                "id": "total_comp_bridge",
                "title": "Strategy 3: Total Comp Bridge (Base + Sign-On)",
                "tag": "Collaborative",
                "badge": "Budget Friendly",
                "description": "Allows HR to protect their strict base salary bands by shifting the requested increase into an upfront signing bonus or extra RSUs.",
                "script": (
                    f"Dear [Recruiter Name],\n\n"
                    f"I want to thank you again for the offer to join {comp}. The compensation package is thoughtful, and I am very eager to get started.\n\n"
                    f"I understand that internal engineering salary bands can sometimes be inflexible for base compensation. "
                    f"My target total first-year compensation is ${target:,.0f}. If increasing the base salary from ${offer:,.0f} is constrained by team parity, "
                    f"would {comp} be open to bridging the ${target - offer:,.0f} difference through a one-time sign-on bonus or an increased initial equity grant?\n\n"
                    f"I want to find a win-win structure that respects your band constraints while aligning with my first-year target!"
                )
            },
            {
                "id": "accelerated_review",
                "title": "Strategy 4: Accelerated 6-Month Performance Review",
                "tag": "Performance Backed",
                "badge": "Low Risk",
                "description": "Proposes a contractual 6-month milestone-based salary adjustment tied to measurable engineering delivery.",
                "script": (
                    f"Dear [Hiring Manager Name],\n\n"
                    f"I am very excited about the opportunity to join {comp} and lead our initiatives around {skill}.\n\n"
                    f"While I am willing to accept the initial base of ${offer:,.0f} to get moving quickly, my market expectation is ${target:,.0f}. "
                    f"Could we include a formal performance checkpoint in my offer letter specifying an accelerated salary review at the 6-month mark? "
                    f"Upon successfully delivering our agreed production milestones, my compensation would adjust to ${target:,.0f}.\n\n"
                    f"I am fully confident in my ability to deliver immediate value to the team and appreciate your willingness to consider this performance-tied approach."
                )
            },
            {
                "id": "quick_phone_pitch",
                "title": "Strategy 5: Verbal Phone Pitch (Bullet Points)",
                "tag": "Spoken Script",
                "badge": "Phone / Video Call",
                "description": "Concise talking points for live phone calls with recruiters to stay calm, polite, and unshakeable.",
                "script": (
                    f"\"I am so excited about this offer and the team at {comp}. I love the engineering culture here.\"\n\n"
                    f"\"Before signing, I'd like to discuss the base compensation. Looking at current market benchmarks for a {role} "
                    f"with my specialized experience in {skill}, I was anticipating a base in the ${target:,.0f} range.\"\n\n"
                    f"\"Is there any flexibility in the budget to move closer to ${target:,.0f}?\"\n\n"
                    f"[If they say no to base]: \"I completely understand budget constraints. Could we explore a signing bonus or additional equity to help bridge that gap?\""
                )
            }
        ]

        return scripts

