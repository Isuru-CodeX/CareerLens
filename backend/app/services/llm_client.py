"""app/services/llm_client.py - one tiny client for Claude, OpenAI and Gemini (plain HTTPS via httpx,
already in requirements.txt, so no new dependency). Returns validated Pydantic objects."""
import os
import json
import time
from typing import Optional, Type, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from app.core.config import settings

T = TypeVar("T", bound=BaseModel)


class LLMError(RuntimeError):
    pass


class LLMClient:
    def _key_for(self, provider: str) -> str:
        return {"anthropic": settings.ANTHROPIC_API_KEY, "openai": settings.OPENAI_API_KEY,
                "gemini": settings.GEMINI_API_KEY}.get(provider, "")

    def _key(self) -> str:
        return self._key_for(self.provider)

    def __init__(self, provider: Optional[str] = None, model: Optional[str] = None,
                 timeout: float = 120.0, transport: Optional[httpx.BaseTransport] = None):
        self.provider = (provider or settings.LLM_PROVIDER).lower()      # anthropic | openai | gemini
        if not self._key_for(self.provider):
            for candidate in ["anthropic", "openai", "gemini"]:
                if self._key_for(candidate):
                    self.provider = candidate
                    break

        default_model = {
            "anthropic": settings.LLM_MODEL_DEEP,
            "openai": "gpt-4o-mini",
            "gemini": os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        }.get(self.provider, settings.LLM_MODEL_DEEP)

        self.model = model or default_model
        self.http = httpx.Client(timeout=timeout, transport=transport)

    @property
    def available(self) -> bool:
        return bool(settings.LLM_ENABLED and self._key())

    # ---- provider calls: each returns a plain dict --------------------------------------
    def _anthropic(self, system: str, user: str, schema: dict, max_tokens: int) -> dict:
        r = self.http.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": self._key(), "anthropic-version": "2023-06-01"},
            json={"model": self.model, "max_tokens": max_tokens, "temperature": 0, "system": system,
                  "messages": [{"role": "user", "content": user}],
                  # forcing a tool call = guaranteed JSON that matches the schema
                  "tools": [{"name": "submit_result", "description": "Return the final structured result.",
                             "input_schema": schema}],
                  "tool_choice": {"type": "tool", "name": "submit_result"}})
        r.raise_for_status()
        for block in r.json()["content"]:
            if block.get("type") == "tool_use":
                return block["input"]
        raise LLMError("Anthropic response had no tool_use block")

    def _openai(self, system: str, user: str, schema: dict, max_tokens: int) -> dict:
        r = self.http.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {self._key()}"},
            json={"model": self.model, "temperature": 0, "max_completion_tokens": max_tokens,
                  "response_format": {"type": "json_object"},
                  "messages": [{"role": "system", "content": system + "\nReturn ONLY a JSON object matching this JSON Schema:\n" + json.dumps(schema)},
                               {"role": "user", "content": user}]})
        r.raise_for_status()
        return json.loads(r.json()["choices"][0]["message"]["content"])

    def _gemini(self, system: str, user: str, schema: dict, max_tokens: int) -> dict:
        r = self.http.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
            headers={"x-goog-api-key": self._key()},
            json={"systemInstruction": {"parts": [{"text": system + "\nReturn ONLY JSON matching this JSON Schema:\n" + json.dumps(schema)}]},
                  "contents": [{"role": "user", "parts": [{"text": user}]}],
                  "generationConfig": {"temperature": 0, "maxOutputTokens": max_tokens,
                                       "responseMimeType": "application/json"}})
        r.raise_for_status()
        return json.loads(r.json()["candidates"][0]["content"]["parts"][0]["text"])

    def _gemini_text(self, system: str, user: str, max_tokens: int) -> str:
        body = {
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": max_tokens}
        }
        if system:
            body["systemInstruction"] = {"parts": [{"text": system}]}
        r = self.http.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
            headers={"x-goog-api-key": self._key()},
            json=body
        )
        r.raise_for_status()
        candidates = r.json().get("candidates", [])
        if candidates and "content" in candidates[0] and "parts" in candidates[0]["content"]:
            return candidates[0]["content"]["parts"][0].get("text", "").strip()
        return ""

    def _openai_text(self, system: str, user: str, max_tokens: int) -> str:
        r = self.http.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {self._key()}"},
            json={"model": self.model, "temperature": 0.2, "max_tokens": max_tokens,
                  "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()

    def _anthropic_text(self, system: str, user: str, max_tokens: int) -> str:
        r = self.http.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": self._key(), "anthropic-version": "2023-06-01"},
            json={"model": self.model, "max_tokens": max_tokens, "temperature": 0.2, "system": system,
                  "messages": [{"role": "user", "content": user}]}
        )
        r.raise_for_status()
        return r.json()["content"][0]["text"].strip()

    # ---- public API ---------------------------------------------------------------------
    def generate_text(self, prompt: str, system: str = "", max_tokens: int = 1000) -> str:
        if not self.available:
            raise LLMError("LLM disabled or API key missing")
        if self.provider == "gemini":
            return self._gemini_text(system, prompt, max_tokens)
        elif self.provider == "openai":
            return self._openai_text(system, prompt, max_tokens)
        else:
            return self._anthropic_text(system, prompt, max_tokens)

    def generate_json(self, system: str, user: str, out_model: Type[T], max_tokens: int = 6000,
                      retries: int = 2) -> T:
        if not self.available:
            raise LLMError("LLM disabled or API key missing")
        call = {"anthropic": self._anthropic, "openai": self._openai, "gemini": self._gemini}[self.provider]
        schema, prompt, last_err = out_model.model_json_schema(), user, None
        for attempt in range(retries + 1):
            try:
                return out_model.model_validate(call(system, prompt, schema, max_tokens))
            except ValidationError as e:           # model returned bad JSON: tell it what was wrong
                last_err = e
                prompt = user + f"\n\nYour previous answer failed validation:\n{str(e)[:800]}\nFix it and answer again."
            except (httpx.TimeoutException, httpx.TransportError) as e:
                last_err = e
                time.sleep(2 ** attempt)
            except httpx.HTTPStatusError as e:
                last_err = e
                if e.response.status_code in (429, 500, 502, 503, 529):
                    time.sleep(2 ** attempt)       # rate-limit / overload: back off and retry
                else:
                    raise LLMError(f"{self.provider} HTTP {e.response.status_code}: {e.response.text[:300]}") from e
        raise LLMError(f"LLM call failed after {retries + 1} attempts: {last_err}")
