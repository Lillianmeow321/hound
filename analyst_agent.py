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
1. 核心结论（3条，每条附2024年以后的具体数据支撑）
2. 各维度详细分析（每个维度至少一个2023年以后的具体厂商案例）
3. 战略建议（2-3条，柔和口吻）
4. 引用来源汇总（列出所有引用的URL）

【写作要求】
- 报告结构和观点表述要简洁专业，不要重复堆砌时效性说明。"""

# 在prompt末尾加
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
    MAX_RETRIES = 2
    
    print("规划研究维度...")
    plan = plan_research(query)
    
    print(f"\n检索知识库...")
    retrieved = retrieve_for_dimensions(plan["dimensions"])
    
    for attempt in range(MAX_RETRIES):
        print(f"\n生成报告中...（第{attempt+1}次）")
        
        # 把上一次审核的问题传给分析Agent
        feedback = review["issues"] if attempt > 0 else []
        report = generate_report(plan["topic"], plan["dimensions"], retrieved, feedback)
        
        print("\n审核报告质量...")
        review = review_report(report, plan["dimensions"])
        print(f"审核评分：{review['score']}/10")
        
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