import os
from datetime import datetime
from openai import OpenAI
from dotenv import load_dotenv
from planner_agent import plan_research
from retriever_agent import retrieve_for_dimensions

load_dotenv()

client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

def generate_report(topic: str, dimensions: list, retrieved: dict, feedback: list = []) -> str:
    current_date = datetime.now().strftime("%Y年%m月")

    context = ""
    for dim_name, docs in retrieved.items():
        context += f"\n## {dim_name}\n"
        for doc in docs:
            source_type = doc.get('type', '私有知识库')
            context += f"[{source_type}] 来源：{doc['source']}\n{doc['content']}\n\n"

    prompt = f"""你是一个资深AI行业研究员，正在为投资机构撰写一份行业分析研报。

研究主题：{topic}

参考资料（包含私有知识库和最新联网搜索结果）：
{context}

不要在报告开头输出报告日期、分析师署名等元信息，直接从正文内容开始。

请按以下结构输出报告，严格遵守以下要求：

【时效性硬指标 - 必须达成】
- 报告中引用的数据点中，至少90%必须来自2025年或2026年
- 其中至少30%必须来自2026年
- 严禁引用2024年及更早的数据，除非用作"历史对比"且在该数据点后明确标注"（历史数据）"
- 数据来源优先级：联网搜索（Tavily返回）> 历史参考 > 私有知识库
- 如果某个维度只有【历史参考】标签的数据，写1-2句简短分析并明确标注数据时间（如"截至2024年底"），不展开，绝对不写"暂无最新数据"
- 每个数据点必须标注其时间（如"2026年Q1""截至2025年底"），方便审核

【时效性强制要求】
1. 报告必须以"{current_date}"作为分析基准日期
2. 优先使用上下文中【联网搜索】标签下的最新数据
3. 如果联网数据和你内部知识冲突，必须采用联网数据，并标注脚注
4. 严禁输出比"{current_date}"早超过6个月的数据作为"近期/最新"
5. 如果某个数据点联网搜索没返回，宁可不写也不要用过时数据填充
6. 报告开头不要写"基准日期"或"分析日期"字样
7. 所有"近期""最新""目前"等词，都必须指向{current_date}的时间段

【数据引用要求】
- 来自联网搜索的数据，在句子末尾加上脚注标记，格式：[^1] [^2] 依此类推
- 私有知识库的数据不需要标注来源
- 报告最底部统一列出所有脚注对应的链接，格式：
  [^1]: 网站名称 URL
  [^2]: 网站名称 URL
- 如果联网数据没有明确URL，不要捏造链接

【展开方式要求】
- 每个观点展开时，必须附上具体厂商的具体案例
- 案例格式：[厂商名]在[时间]遇到了[具体问题]，导致[具体结果（数据）]，随后采取了[具体措施]，最终实现了[具体结果]
- 不要写泛泛的"建议通过内容更新提升留存"，要说"XX产品在XX年通过XX具体做法，将30日留存率从X%提升至X%"

【战略建议要求】
- 口吻保持柔和，保留余地，体现投资视角的审慎
- 用"值得关注""可以考虑""有潜力"等措辞，而非"必须""应该立刻"
- 每条建议简练，不超过150字

报告结构：
1. 核心结论（3条，每条附2025年或2026年的具体数据支撑，并标注时间）
2. 各维度详细分析（每个维度至少一个2025年以后的具体厂商案例，标注时间）
3. 战略建议（2-3条，柔和口吻）
4. 引用来源汇总（列出所有引用的URL）

【写作要求】
- 报告结构和观点表述要简洁专业，不要重复堆砌时效性说明。

【数据清单 - 必须在报告正文结束后输出】
紧接正文之后，输出如下格式的数据清单，供程序自动验证时效性，不计入报告展示内容：

__data_inventory__
[
  {{"claim": "数据点一句话描述", "year": 数字年份, "dimension": "所属维度名称", "source_type": "联网搜索或历史参考或私有知识库"}},
  ...
]
__end_inventory__

规则：
- 每个含具体数字、百分比、市场规模、增速、厂商案例的数据点都必须列入
- year填写数据本身所描述的年份（整数），无法确定年份的填0
- 【历史参考】来源的数据点source_type填"历史参考"，其余联网搜索的填"联网搜索""""

    if feedback:
        prompt += f"\n\n上一版报告的问题，请重点改进：\n" + "\n".join([f"- {i}" for i in feedback])

    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5,
        stream=True  # 流式输出
    )

    print("\n" + "="*50)
    print(f"研究报告：{topic}")
    print("="*50 + "\n")
    
    full_response = ""
    for chunk in response:
        if chunk.choices[0].delta.content:
            text = chunk.choices[0].delta.content
            print(text, end="", flush=True)
            full_response += text
    
    print("\n")
    return full_response

if __name__ == "__main__":
    from reviewer_agent import review_report
    
    query = input("请输入研究方向：\n> ").strip()
    MAX_RETRIES = 3

    print("规划研究维度...")
    plan = plan_research(query)

    print(f"\n检索知识库...")
    retrieved = retrieve_for_dimensions(plan["dimensions"])

    review = {}
    for attempt in range(MAX_RETRIES):
        print(f"\n生成报告中...（第{attempt+1}次）")

        feedback = []
        if attempt > 0:
            feedback = list(review.get("issues", []))

        report = generate_report(plan["topic"], plan["dimensions"], retrieved, feedback)

        print("\n审核报告质量...")
        review = review_report(report, plan["dimensions"])
        print(f"审核评分：{review['score']}/10")
        timeliness = review.get("时效性统计", {})
        if timeliness:
            print(f"时效性：2025-2026占比{timeliness.get('2025-2026占比','?')}，"
                  f"2026占比{timeliness.get('2026占比','?')}，"
                  f"达标：{timeliness.get('时效性是否达标','?')}")

        if review["pass"]:
            print("✅ 报告通过审核！")
            print(f"\n💡 如需进一步优化，可以关注以下方向：")
            for suggestion in review.get("suggestions", []):
                print(f"   - {suggestion}")
            break
        else:
            print(f"❌ 未通过，问题：{review['issues']}")
            if attempt < MAX_RETRIES - 1:
                print("重新生成...")
    else:
        print("⚠️ 达到最大重试次数，输出最后一版报告")