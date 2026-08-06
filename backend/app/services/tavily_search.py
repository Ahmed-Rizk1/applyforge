import json
import logging
import urllib.request
from typing import Any, Dict, List
from app.config import settings

logger = logging.getLogger(__name__)


def search_tavily(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    """Query Tavily Search API and return list of result snippets + URLs."""
    if not settings.tavily_api_key:
        logger.info("TAVILY_API_KEY is not set. Returning fallback search context.")
        return [
            {
                "title": "Glassdoor Tech Compensation Benchmark 2025",
                "url": "https://www.glassdoor.com/Salaries",
                "snippet": f"Market salary benchmarks and compensation data for {query}."
            },
            {
                "title": "Levels.fyi Salary Reports",
                "url": "https://www.levels.fyi",
                "snippet": f"Verified tech compensation and bonus ranges for roles matching {query}."
            }
        ]

    payload = {
        "api_key": settings.tavily_api_key,
        "query": query,
        "search_depth": "basic",
        "include_answer": False,
        "max_results": max_results
    }

    try:
        req = urllib.request.Request(
            "https://api.tavily.com/search",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "User-Agent": "ApplyForge/1.0"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            results = data.get("results", [])
            output = []
            for item in results:
                output.append({
                    "title": str(item.get("title", "Web Source")),
                    "url": str(item.get("url", "")),
                    "snippet": str(item.get("content", item.get("snippet", "")))[:300]
                })
            return output
    except Exception as exc:
        logger.warning(f"Tavily search query failed: {exc}. Returning fallback search context.")
        return [
            {
                "title": "Market Salary Benchmark",
                "url": "https://www.levels.fyi",
                "snippet": f"Estimated compensation range for {query}."
            }
        ]
