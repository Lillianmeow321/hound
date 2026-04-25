import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

def plan_research(user_query: str) -> dict:
    """规划Agent：把用户的研究需求拆解成具体维度"""
    
    prompt = f"""你是一个资深AI行业研究员。用户想研究一个AI赛道，请将研究需求拆解为5个具体的研究维度。

用户需求：{user_query}

请严格按照以下JSON格式输出，不要有任何其他文字：
{{
  "topic": "研究主题",
  "dimensions": [
    {{"name": "产品定位", "query": "具体检索关键词"}},
    {{"name": "变现模式", "query": "具体检索关键词"}},
    {{"name": "用户画像", "query": "具体检索关键词"}},
    {{"name": "竞争格局", "query": "具体检索关键词"}},
    {{"name": "增长策略", "query": "具体检索关键词"}}
  ]
}}"""

    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )
    
    result = response.choices[0].message.content
    return json.loads(result)

if __name__ == "__main__":
    query = "AI陪伴类产品的竞争格局分析"
    print(f"用户输入：{query}\n")
    result = plan_research(query)
    print(f"研究主题：{result['topic']}\n")
    print("拆解的研究维度：")
    for i, dim in enumerate(result['dimensions']):
        print(f"  {i+1}. {dim['name']}：{dim['query']}")