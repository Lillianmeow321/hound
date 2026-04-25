import os
import json
from datetime import datetime
from openai import OpenAI
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from web_search import search_web

load_dotenv()

client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

# 连接market_sizing collection
print("加载BGE模型...")
qdrant_client = QdrantClient(path="./qdrant_db")
embeddings = HuggingFaceEmbeddings(
    model_name="BAAI/bge-large-zh-v1.5",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True}
)
vectorstore = QdrantVectorStore(
    client=qdrant_client,
    collection_name="market_sizing",
    embedding=embeddings
)


def collect_company_info(initial_input: str) -> str:
    """通过最多3轮追问，收集足够的公司信息"""

    collected_info = initial_input

    for round in range(3):
        check_prompt = f"""用户想做一家公司的市场规模测算。

目前收集到的信息：
{collected_info}

做市场规模测算需要以下信息：
1. 业务性质（这家公司做什么）
2. 目标用户群体
3. 目标地理市场
4. 商业模式/变现方式
5. 未来扩张计划（可选）

请判断：现有信息是否足够开始测算？

如果足够，输出：{{"ready": true, "summary": "整理后的公司信息摘要"}}
如果不够，输出：{{"ready": false, "question": "最重要的一个追问问题（简短，一句话）"}}

只输出JSON，不要其他文字。"""

        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": check_prompt}],
            temperature=0.1
        )

        result = response.choices[0].message.content.strip()
        result = result.replace("```json", "").replace("```", "").strip()
        data = json.loads(result)

        if data["ready"]:
            print("\n✅ 信息收集完毕，开始测算...\n")
            return data["summary"]

        # 追问用户
        question = data["question"]
        print(f"\n🤔 {question}")
        user_answer = input("你：").strip()

        if not user_answer:
            break

        collected_info += f"\n{question} {user_answer}"

    # 3轮追问结束，用现有信息直接开始
    print("\n✅ 开始测算...\n")
    return collected_info


def retrieve_sizing_references(company_info: str) -> list:
    """从market_sizing知识库里检索类似公司的测算案例"""
    docs = vectorstore.similarity_search(company_info, k=4)
    return [
        {
            "source": doc.metadata.get("source", "").split("/")[-1],
            "content": doc.page_content
        }
        for doc in docs
    ]


def generate_market_sizing(company_info: str) -> str:
    """生成市场规模测算报告"""
    current_date = datetime.now().strftime("%Y年%m月")

    # 从知识库检索类似案例
    print("🔍 检索类似公司的测算案例...")
    references = retrieve_sizing_references(company_info)
    ref_text = "\n\n".join([f"【参考案例】\n{r['content']}" for r in references])

    # 联网搜索行业数据
    print("🌐 联网搜索行业数据...")
    web_results = search_web(f"{company_info} 市场规模 行业数据", max_results=3)
    web_text = "\n\n".join([
        f"[{r['title']}]({r['source']})\n{r['content']}"
        for r in web_results
    ])

    prompt = f"""你是一个资深投资研究员，擅长市场规模测算。

用户提供的公司信息：
{company_info}

知识库中类似公司的测算案例（提取其中的测算逻辑和方法，不要照搬数据）：
{ref_text}

联网搜索的行业数据（标注来源）：
{web_text}

不要在报告开头输出报告日期、分析师署名等元信息，直接从正文内容开始。

请输出一份市场规模测算报告，严格按以下结构：

## 业务定性
用2-3句话概括这家公司在做什么，服务什么人群。

## 测算框架
根据公司业务特点，从以下方法中选择最合适的1-2种，说明选择理由：
- 自上而下法：行业总规模 × 渗透率
- 自下而上法：目标用户数 × 客单价
- 用户价值法：对标成熟公司估值 ÷ 用户数 × 目标用户数
- 类比法：海外成熟市场对标公司 × 中国市场系数
- 收入倍数法：对标公司收入 × PS倍数

## TAM → SAM → SOM 拆解
- **TAM**（总体可及市场）：[数字] [来源脚注]
  测算逻辑：...
- **SAM**（可服务市场）：[数字] [来源脚注]
  测算逻辑：...
- **SOM**（可获取市场）：[数字] [来源脚注]
  测算逻辑：...

## 三种情景
| 情景 | 假设条件 | 市场规模 |
|------|---------|---------|
| 乐观 | ... | ... |
| 中性 | ... | ... |
| 悲观 | ... | ... |

## 关键假设与风险
列出测算中最重要的3个假设，以及如果假设不成立会有什么影响。

## 引用来源
列出所有联网数据的来源链接。

【时效性强制要求】
1. 报告必须以"{current_date}"作为分析基准日期
2. 优先使用上下文中【联网搜索】标签下的最新数据
3. 如果联网数据和你内部知识冲突，必须采用联网数据，并标注脚注
4. 严禁输出比"{current_date}"早超过6个月的数据作为"近期/最新"
5. 如果某个数据点联网搜索没返回，宁可不写也不要用过时数据填充
6. 报告开头不要写"基准日期"或"分析日期"字样
7. 所有"近期""最新""目前"等词，都必须指向{current_date}的时间段

【写作要求】
- 联网数据后面加脚注标记 [^1] [^2]
- 口吻审慎，保留余地，用"估计""约""参考"等措辞
- 每个数字都要有来源或推导逻辑，不要凭空捏造
- 参考知识库案例的测算思路，但数据要用联网搜索的最新数据"""

    print("\n✍️  生成测算报告...")
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        stream=True
    )

    print("\n" + "="*50)
    full = ""
    for chunk in response:
        if chunk.choices[0].delta.content:
            text = chunk.choices[0].delta.content
            print(text, end="", flush=True)
            full += text
    print()
    return full


if __name__ == "__main__":
    print("="*50)
    print("市场规模测算助手")
    print("="*50)
    initial = input("\n请描述这家公司（简单说几句也可以）：\n> ").strip()
    company_info = collect_company_info(initial)
    generate_market_sizing(company_info)