import os
from tavily import TavilyClient
from dotenv import load_dotenv

load_dotenv()
client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

def search_web(query: str, max_results: int = 3, days: int = None) -> list:
    """联网搜索，返回结构化结果。days=None 表示不限时间。"""
    try:
        params = {
            "query": query,
            "max_results": max_results,
            "search_depth": "advanced",
        }
        if days is not None:
            params["days"] = days

        response = client.search(**params)

        results = []
        for r in response.get("results", []):
            results.append({
                "source": r["url"],
                "title": r.get("title", ""),
                "content": r["content"][:400],
                "published_date": r.get("published_date", ""),
            })
        return results
    except Exception as e:
        print(f"  ✗ 联网搜索失败：{e}")
        return []