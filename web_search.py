import os
from tavily import TavilyClient
from dotenv import load_dotenv

load_dotenv()
client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

def search_web(query: str, max_results: int = 3) -> list:
    """联网搜索，返回结构化结果"""
    try:
        response = client.search(
            query=query,
            max_results=max_results,
            search_depth="advanced",
            days=180
        )
        # 如果结果为空，降级到不限时间
        if not response.get("results"):
            response = client.search(
                query=query,
                max_results=max_results,
                search_depth="advanced"
            )

        results = []
        for r in response["results"]:
            results.append({
                "source": r["url"],
                "title": r["title"],
                "content": r["content"][:400]
            })
        return results
    except Exception as e:
        print(f"  ✗ 联网搜索失败：{e}")
        return []