import os
import json
from openai import OpenAI
from dotenv import load_dotenv
from planner_agent import plan_research
from retriever_agent import retrieve_for_dimensions
from analyst_agent import generate_report
from reviewer_agent import review_report

load_dotenv()

client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

def classify_intent(user_input: str, has_report: bool) -> dict:
    """意图识别：判断用户想做什么"""
    if not has_report:
        return {"intent": "new_report", "target": user_input}

    prompt = f"""用户正在使用AI研究助手，已经生成了一份研究报告。判断用户的意图。

用户输入：{user_input}

请严格输出以下JSON之一，不要有其他文字：

如果用户想切换到新赛道/新话题（如"换成分析XX""帮我研究XX"）：
{{"intent": "new_report", "target": "新的研究主题"}}

如果用户想追问报告中某个具体内容（如"XX那块能展开讲讲吗""XX是什么意思"）：
{{"intent": "followup", "target": "追问的具体内容"}}

如果用户想修改报告某个部分（如"战略建议重写""XX部分口吻改柔和一些"）：
{{"intent": "revise", "target": "需要修改的部分和要求"}}"""

    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1
    )
    result = response.choices[0].message.content.strip()
    result = result.replace("```json", "").replace("```", "").strip()
    return json.loads(result)


def handle_followup(user_input: str, report: str, history: list) -> str:
    """处理追问：基于已有报告直接回答"""
    messages = history + [
        {
            "role": "user",
            "content": f"""以下是当前研究报告：

{report}

用户追问：{user_input}

请基于报告内容回答，如果报告中没有相关信息，说明需要补充检索。回答简洁专业。"""
        }
    ]
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=messages,
        temperature=0.3
    )
    return response.choices[0].message.content


def handle_revision(user_input: str, report: str, history: list) -> str:
    """处理修改请求：只输出修改的部分，然后静默更新完整报告"""
    
    # 第一步：只输出修改后的那部分给用户看
    messages = history + [
        {
            "role": "user",
            "content": f"""以下是当前研究报告：

{report}

用户修改请求：{user_input}

严格按以下格式输出，不要有其他内容：
第一行：「已修改：[部分名称]」
第二行开始：只输出修改后的那个部分，不超过300字，绝对不要输出完整报告。"""
        }
    ]
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=messages,
        temperature=0.3,
        stream=True
    )
    partial = ""
    for chunk in response:
        if chunk.choices[0].delta.content:
            text = chunk.choices[0].delta.content
            print(text, end="", flush=True)
            partial += text
    print()

    # 第二步：静默生成完整的更新报告（不打印给用户）
    full_response = client.chat.completions.create(
        model="deepseek-chat",
        messages=history + [
            {
                "role": "user", 
                "content": f"以下是研究报告：\n\n{report}\n\n请根据以下要求修改，输出完整报告：{user_input}"
            }
        ],
        temperature=0.3
    )
    updated_report = full_response.choices[0].message.content
    return updated_report


def run_new_report(query: str) -> tuple:
    """生成新报告，返回 (report, plan)"""
    print("\n📋 规划研究维度...")
    plan = plan_research(query)
    print(f"研究主题：{plan['topic']}")
    for i, dim in enumerate(plan["dimensions"]):
        print(f"  {i+1}. {dim['name']}")

    print("\n🔍 检索知识库 + 联网搜索...")
    retrieved = retrieve_for_dimensions(plan["dimensions"])

    MAX_RETRIES = 2
    report = ""
    for attempt in range(MAX_RETRIES):
        print(f"\n✍️  生成报告中...（第{attempt+1}次）")
        feedback = []
        if attempt > 0:
            feedback = review.get("issues", [])
        report = generate_report(plan["topic"], plan["dimensions"], retrieved, feedback)
        
        print("\n🔎 审核报告质量...")
        review = review_report(report, plan["dimensions"])
        print(f"审核评分：{review['score']}/10")

        if review["pass"]:
            print("✅ 报告通过审核！")
            if review.get("suggestions"):
                print("\n💡 可以进一步优化的方向：")
                for s in review["suggestions"]:
                    print(f"   - {s}")
            break
        else:
            print(f"❌ 未通过：{review['issues']}")
            if attempt < MAX_RETRIES - 1:
                print("重新生成...")

    return report, plan


def main():
    print("=" * 50)
    print("AI研究助手 — 多Agent竞品分析系统")
    print("输入研究方向开始，输入 'quit' 退出")
    print("=" * 50)

    history = []      # 对话历史
    current_report = ""  # 当前报告
    current_plan = None  # 当前研究计划

    while True:
        print()
        user_input = input("你：").strip()

        if not user_input:
            continue
        if user_input.lower() in ["quit", "exit", "退出"]:
            print("再见！")
            break

        # 识别意图
        intent_result = classify_intent(user_input, bool(current_report))
        intent = intent_result["intent"]
        target = intent_result["target"]

        if intent == "new_report":
            # 生成新报告
            current_report, current_plan = run_new_report(target)


            # 更新对话历史
            history.append({"role": "user", "content": user_input})
            history.append({"role": "assistant", "content": f"已生成关于「{target}」的研究报告。"})

        elif intent == "followup":
            # 追问
            print(f"\n💬 追问：{target}\n")
            answer = handle_followup(user_input, current_report, history)
            print(f"\n助手：{answer}")
            history.append({"role": "user", "content": user_input})
            history.append({"role": "assistant", "content": answer})

        elif intent == "revise":
            # 修改报告
            print(f"\n✏️  修改：{target}\n")
            current_report = handle_revision(user_input, current_report, history)
            history.append({"role": "user", "content": user_input})
            history.append({"role": "assistant", "content": "已按要求修改报告。"})

        # 保持history不超过20条，避免上下文太长
        if len(history) > 20:
            history = history[-20:]


if __name__ == "__main__":
    main()