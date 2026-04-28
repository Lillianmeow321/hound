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

请检查以下两大类：

【内容质量检查】
1. 是否覆盖了所有研究维度？
2. 每个维度是否有实质性内容（不只是说"信息不足"）？
3. 是否有核心结论和战略建议？

【时效性硬性审核】
逐条找出报告中所有数据点和案例（包括数字、百分比、市场规模、增速、厂商案例等），统计：
- 总数据点数量 = N
- 来自2025年或2026年的数据点数量 = M（数据点有明确时间标注"2025"或"2026"的）
- 来自2026年的数据点数量 = K（数据点有明确时间标注"2026"的）

判定标准（以下任一条不满足即时效性不达标）：
- 若 M/N < 90%：时效性不达标，在issues中说明"时效性不达标：仅X%的数据来自2025-2026年，要求至少90%"
- 若 K/N < 30%：时效性不达标，在issues中说明"2026年数据占比不足：仅X%，要求至少30%"
- 若存在没有明确时间标注的数据点：时效性不达标，在issues中说明"所有数据点必须标注时间"

"pass"字段须同时满足内容质量和时效性两大类检查才能为true。

严格按以下JSON格式输出，不要有其他文字：
{{
  "pass": true或false,
  "missing_dimensions": ["缺失的维度名称"],
  "issues": ["具体问题描述"],
  "score": 1到10的评分,
  "suggestions": ["即使通过审核，还可以在哪些地方进一步优化，每条50字以内，最多3条"],
  "时效性统计": {{
    "总数据点": N,
    "2025-2026占比": "X%",
    "2026占比": "Y%",
    "时效性是否达标": true或false
  }}
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