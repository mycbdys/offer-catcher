"""Unified LLM client using OpenAI-compatible API format (DeepSeek, OpenAI, etc.)."""

import json
import httpx
from app.core.config import settings


async def chat(
    prompt: str,
    system: str = "",
    max_tokens: int = 2000,
    temperature: float = 0.3,
) -> str | None:
    """Send a chat completion request and return the response text."""
    if not settings.LLM_API_KEY:
        return None

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(
                f"{settings.LLM_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.LLM_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.LLM_MODEL,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                },
            )
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"[LLM] API call failed: {e}")
        return None


async def chat_json(
    prompt: str,
    system: str = "",
    max_tokens: int = 2000,
    temperature: float = 0.1,
) -> dict | None:
    """Send a chat request and parse the response as JSON."""
    text = await chat(prompt, system, max_tokens, temperature)
    if not text:
        return None

    # Try to extract JSON from markdown code blocks
    import re
    json_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL)
    if json_match:
        text = json_match.group(1)

    # Try to find JSON object
    json_match = re.search(r'\{.*\}', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            pass

    return None
