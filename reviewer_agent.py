import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

def review_report(report: str, dimensions: list) -> dict:
    """审核Agent：检查报告质量，返回是否通过和问题列表"""
    
    dim_names = [d["name"] for d in dimensions]
    
    prompt = f"""你是一个严格的研究报告审核专家。请审核以下报告是否合格。

需要覆盖的研究维度：{dim_names}

报告内容：
{report[:6000]}

请检查：
1. 是否覆盖了所有研究维度？
2. 每个维度是否有实质性内容（不只是说"信息不足"）？
3. 是否有核心结论和战略建议？

严格按以下JSON格式输出，不要有其他文字：
{{
  "pass": true或false,
  "missing_dimensions": ["缺失的维度名称"],
  "issues": ["具体问题描述"],
  "score": 1到10的评分
  "suggestions": ["即使通过审核，还可以在哪些地方进一步优化，每条50字以内，最多3条"]
}}"""

    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1
    )
    
    result = response.choices[0].message.content.strip()
    # 清理可能的markdown代码块
    result = result.replace("```json", "").replace("```", "").strip()
    return json.loads(result)