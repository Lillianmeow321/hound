import os
import re
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)


def _parse_inventory(report: str) -> tuple[list, str | None]:
    """从报告中提取 __data_inventory__ JSON，返回 (数据点列表, 错误信息)。"""
    match = re.search(r"__data_inventory__\s*(\[.*?\])\s*__end_inventory__", report, re.DOTALL)
    if not match:
        return [], "报告未输出__data_inventory__数据清单，无法程序化验证时效性"
    try:
        inventory = json.loads(match.group(1))
        return inventory, None
    except json.JSONDecodeError as e:
        return [], f"__data_inventory__格式解析失败：{e}"


def _calc_timeliness(inventory: list) -> dict:
    """程序化计算时效性指标，历史参考且year<2025的数据点不计入分母。"""
    countable = [
        p for p in inventory
        if isinstance(p.get("year"), int) and p["year"] > 0
        and not (p.get("source_type") == "历史参考" and p["year"] < 2025)
    ]
    N = len(countable)
    if N == 0:
        return {
            "总数据点": 0,
            "2025-2026占比": "N/A",
            "2026占比": "N/A",
            "时效性是否达标": False,
            "_issues": ["有效数据点为0，无法计算时效性"],
        }

    M = sum(1 for p in countable if p["year"] >= 2025)
    K = sum(1 for p in countable if p["year"] >= 2026)
    ratio_2025 = M / N
    ratio_2026 = K / N

    issues = []
    if ratio_2025 < 0.9:
        issues.append(
            f"时效性不达标：仅{ratio_2025:.0%}的数据来自2025-2026年，要求至少90%"
        )
    if ratio_2026 < 0.3:
        issues.append(
            f"2026年数据占比不足：仅{ratio_2026:.0%}，要求至少30%"
        )

    return {
        "总数据点": N,
        "2025-2026占比": f"{ratio_2025:.0%}",
        "2026占比": f"{ratio_2026:.0%}",
        "时效性是否达标": len(issues) == 0,
        "_issues": issues,
    }


def _check_year_frequency(report_body: str) -> dict:
    """直接扫报告正文的年份词频，独立于模型自报的inventory，防止模型伪造年份。"""
    years = re.findall(r"\b(202[3-6])\b", report_body)
    if not years:
        return {"时效性是否达标": True, "_issues": []}  # 无年份词，跳过

    total = len(years)
    count_2025_plus = sum(1 for y in years if int(y) >= 2025)
    count_2026 = sum(1 for y in years if int(y) == 2026)
    ratio_2025 = count_2025_plus / total
    ratio_2026 = count_2026 / total

    issues = []
    if ratio_2025 < 0.9:
        issues.append(
            f"正文年份词频不达标：2025-2026年提及占比仅{ratio_2025:.0%}（要求≥90%）"
            f"，年份分布：{ {y: years.count(y) for y in sorted(set(years))} }"
        )
    if ratio_2026 < 0.3:
        issues.append(
            f"正文2026年提及占比仅{ratio_2026:.0%}（要求≥30%）"
        )
    return {"时效性是否达标": len(issues) == 0, "_issues": issues}


def review_report(report: str, dimensions: list) -> dict:
    """审核Agent：内容质量由LLM判断，时效性由Python程序化验证。"""

    dim_names = [d["name"] for d in dimensions]

    # 去掉 inventory 块再送给 LLM，避免干扰内容审核
    report_body = re.sub(
        r"__data_inventory__.*?__end_inventory__", "", report, flags=re.DOTALL
    ).strip()

    prompt = f"""你是一个严格的研究报告审核专家。请审核以下报告的内容质量是否合格。

需要覆盖的研究维度：{dim_names}

报告内容：
{report_body[:6000]}

请检查：
1. 是否覆盖了所有研究维度？
2. 每个维度是否有实质性内容（不只是说"信息不足"）？
3. 是否有核心结论和战略建议？

严格按以下JSON格式输出，不要有其他文字：
{{
  "content_pass": true或false,
  "missing_dimensions": ["缺失的维度名称"],
  "content_issues": ["具体内容问题描述"],
  "score": 1到10的评分,
  "suggestions": ["即使通过审核，还可以在哪些地方进一步优化，每条50字以内，最多3条"]
}}"""

    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
    )

    raw = response.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()
    llm_result = json.loads(raw)

    # 验证1：inventory自报年份（检测数据点覆盖率）
    inventory, parse_error = _parse_inventory(report)
    if parse_error:
        timeliness = {
            "总数据点": 0,
            "2025-2026占比": "N/A",
            "2026占比": "N/A",
            "时效性是否达标": False,
            "_issues": [parse_error],
        }
    else:
        timeliness = _calc_timeliness(inventory)

    # 验证2：正文年份词频（独立验证，防止模型伪造inventory年份）
    freq_check = _check_year_frequency(report_body)

    timeliness_issues = timeliness.pop("_issues") + freq_check["_issues"]
    timeliness_pass = timeliness["时效性是否达标"] and freq_check["时效性是否达标"]
    timeliness["时效性是否达标"] = timeliness_pass

    all_issues = llm_result.get("content_issues", []) + timeliness_issues

    return {
        "pass": llm_result["content_pass"] and timeliness_pass,
        "missing_dimensions": llm_result.get("missing_dimensions", []),
        "issues": all_issues,
        "score": llm_result["score"],
        "suggestions": llm_result.get("suggestions", []),
        "时效性统计": timeliness,
    }
