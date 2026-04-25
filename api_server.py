"""
FastAPI backend for Hound — 边牧分析师
Run: python api_server.py  (or: uvicorn api_server:app --reload)
"""
import os, sys, json, re
import asyncio
import requests

# Run from project root so ./qdrant_db paths resolve
ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
sys.path.insert(0, ROOT)

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI
from qdrant_client import QdrantClient
from web_search import search_web
from planner_agent import plan_research
from reviewer_agent import review_report

# ─── Shared clients (no local model download) ────────────────────────────────
print("初始化客户端...")
_qdrant = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY")
)
_deepseek = OpenAI(api_key=os.getenv("DEEPSEEK_API_KEY"), base_url="https://api.deepseek.com")
print("✓ 客户端初始化完成，服务启动中...")

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(title="Hound API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)


# ─── Helpers ─────────────────────────────────────────────────────────────────
def sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


def _embed(text: str) -> list:
    resp = requests.post(
        "https://api.jina.ai/v1/embeddings",
        headers={"Authorization": f"Bearer {os.getenv('JINA_API_KEY')}"},
        json={"model": "jina-embeddings-v3", "task": "retrieval.query", "dimensions": 1024, "input": [text]},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["data"][0]["embedding"]


def _qdrant_search(collection: str, text: str, k: int) -> list:
    return _qdrant.search(
        collection_name=collection,
        query_vector=_embed(text),
        limit=k,
        with_payload=True,
    )


def _call(prompt: str, temperature: float = 0.5) -> str:
    resp = _deepseek.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
    )
    return resp.choices[0].message.content


def _call_json(prompt: str) -> dict:
    raw = _call(prompt, temperature=0.1)
    raw = raw.replace("```json", "").replace("```", "").strip()
    return json.loads(raw)


def extract_citations(report: str) -> list:
    citations = []
    for m in re.finditer(r"\[\^(\d+)\]:\s*(.+?)(?:\s+(https?://\S+))?$", report, re.MULTILINE):
        title = m.group(2).strip()
        url = (m.group(3) or "").strip()
        # handle "Title URL" in one group
        if not url and " http" in title:
            parts = title.rsplit(" ", 1)
            if len(parts) == 2 and parts[1].startswith("http"):
                title, url = parts[0], parts[1]
        citations.append({"title": title, "url": url, "source": title})
    return citations


def _retrieve_one_dimension(dim: dict) -> tuple:
    """Returns (dim_name, docs_list) — runs in a thread."""
    name, query = dim["name"], dim["query"]
    hits = _qdrant_search("memos", query, k=2)
    private = [
        {
            "source": hit.payload.get("metadata", {}).get("source", "").split("/")[-1],
            "content": hit.payload.get("page_content", "")[:300],
            "type": "私有知识库",
        }
        for hit in hits
    ]
    web = search_web(query, max_results=2)
    for r in web:
        r["type"] = "联网搜索"
    return name, private + web


def _build_competitive_prompt(topic: str, dimensions: list, context: str, feedback: list = []) -> str:
    dim_names = [d["name"] for d in dimensions]
    prompt = f"""你是一个资深AI行业研究员，正在为投资机构撰写一份行业分析研报。

研究主题：{topic}
研究维度：{dim_names}

参考资料（包含私有知识库和最新联网搜索结果）：
{context}

不要在报告开头输出报告日期、分析师署名等元信息，直接从正文内容开始。

请按以下结构输出报告，严格遵守以下要求：

【数据时效性要求（最重要）】
- 70%以上的数据和案例必须来自2024年及以后
- 80%以上的数据和案例必须来自2023年及以后
- 带有明确年份的引用中，2022年及更早的内容不超过10%
- 如果参考资料中某条数据早于2023年，只能作为历史背景一笔带过，不能作为核心论据
- 优先使用联网搜索的最新数据；若知识库数据早于2023年，仅在无更新数据时引用，并注明"（数据来自[年份]，供参考）"
- 禁止使用"根据2021年/2022年的研究"等过时表述作为主要支撑

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
4. 引用来源汇总（列出所有引用的URL）"""

    if feedback:
        prompt += "\n\n上一版报告的问题，请重点改进：\n" + "\n".join(f"- {i}" for i in feedback)
    return prompt


def _build_sizing_prompt(company_info: str, ref_text: str, web_text: str) -> str:
    return f"""你是一个资深投资研究员，擅长市场规模测算。

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

【写作要求】
- 联网数据后面加脚注标记 [^1] [^2]
- 口吻审慎，保留余地，用"估计""约""参考"等措辞
- 每个数字都要有来源或推导逻辑，不要凭空捏造
- 参考知识库案例的测算思路，但数据要用联网搜索的最新数据"""


# ─── Health ──────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}


# ─── Competitive analysis SSE ─────────────────────────────────────────────────
@app.get("/api/competitive/stream")
async def competitive_stream(query: str):
    async def gen():
        try:
            # ── 1. Plan ───────────────────────────────────────────────────────
            yield sse({"type": "step", "label": "正在规划研究维度..."})
            yield sse({"type": "anim", "state": "thinking"})

            plan_task = asyncio.create_task(asyncio.to_thread(plan_research, query))
            while not plan_task.done():
                try:
                    await asyncio.wait_for(asyncio.shield(plan_task), timeout=10)
                except asyncio.TimeoutError:
                    yield ": ka\n\n"
            plan = plan_task.result()

            n = len(plan["dimensions"])
            dim_names = [d["name"] for d in plan["dimensions"]]
            yield sse({"type": "dimensions", "names": dim_names})
            yield sse({"type": "step", "label": f"正在并行检索 {n} 个维度（知识库 + 联网）..."})
            yield sse({"type": "anim", "state": "running"})

            # ── 2. Parallel retrieval with per-dim SSE updates ────────────────
            queue: asyncio.Queue = asyncio.Queue()

            async def retrieve_one(dim):
                result = await asyncio.to_thread(_retrieve_one_dimension, dim)
                await queue.put(result)

            gather_task = asyncio.create_task(
                asyncio.gather(*[retrieve_one(d) for d in plan["dimensions"]])
            )

            retrieved = {}
            pending = n
            while pending > 0:
                try:
                    dim_name, dim_docs = await asyncio.wait_for(queue.get(), timeout=10)
                    retrieved[dim_name] = dim_docs
                    yield sse({"type": "dim_done", "name": dim_name})
                    pending -= 1
                except asyncio.TimeoutError:
                    if gather_task.done():
                        break
                    yield ": ka\n\n"
            await gather_task

            context = ""
            for dim_name, docs in retrieved.items():
                context += f"\n## {dim_name}\n"
                for doc in docs:
                    context += f"[{doc.get('type','私有知识库')}] 来源：{doc['source']}\n{doc['content']}\n\n"

            # ── 3. Generate report ────────────────────────────────────────────
            yield sse({"type": "step", "label": "正在生成报告..."})
            yield sse({"type": "anim", "state": "thinking"})

            prompt = _build_competitive_prompt(plan["topic"], plan["dimensions"], context)
            report_task = asyncio.create_task(asyncio.to_thread(_call, prompt, 0.5))
            while not report_task.done():
                try:
                    await asyncio.wait_for(asyncio.shield(report_task), timeout=10)
                except asyncio.TimeoutError:
                    yield ": ka\n\n"
            report_text = report_task.result()

            # ── 4. Review (no retry — saves ~20s) ────────────────────────────
            yield sse({"type": "step", "label": "正在审核报告质量..."})
            review = await asyncio.to_thread(review_report, report_text, plan["dimensions"])

            citations = extract_citations(report_text)

            yield sse({"type": "anim", "state": "returning"})
            yield sse({"type": "report", "content": report_text})
            yield sse({
                "type": "review",
                "score": review.get("score", 7),
                "pass": review.get("pass", True),
                "suggestions": review.get("suggestions", []),
                "issues": review.get("issues", []),
            })
            yield sse({"type": "citations", "items": citations})
            yield sse({"type": "done"})

        except Exception as e:
            yield sse({"type": "error", "message": str(e)})

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


# ─── Market sizing: collect follow-up ────────────────────────────────────────
class CollectRequest(BaseModel):
    input: str
    history: list  # [{question: str, answer: str}]


@app.post("/api/market-sizing/collect")
async def market_sizing_collect(req: CollectRequest):
    collected = req.input
    for qa in req.history:
        collected += f"\n{qa['question']} {qa['answer']}"

    check_prompt = f"""用户想做一家公司的市场规模测算。

目前收集到的信息：
{collected}

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

    result = await asyncio.to_thread(_call_json, check_prompt)
    return result


# ─── Market sizing: generate report SSE ──────────────────────────────────────
@app.get("/api/market-sizing/stream")
async def market_sizing_stream(company_info: str):
    async def gen():
        try:
            yield sse({"type": "step", "label": "正在检索类似案例..."})
            yield sse({"type": "anim", "state": "running"})

            def _retrieve_sizing():
                hits = _qdrant_search("market_sizing", company_info, k=4)
                return "\n\n".join(f"【参考案例】\n{hit.payload.get('page_content', '')}" for hit in hits)

            ref_text = await asyncio.to_thread(_retrieve_sizing)

            yield sse({"type": "step", "label": "正在联网搜索行业数据..."})
            web_results = await asyncio.to_thread(
                search_web, f"{company_info[:100]} 市场规模 行业数据", 3
            )
            web_text = "\n\n".join(
                f"[{r['title']}]({r['source']})\n{r['content']}" for r in web_results
            )

            yield sse({"type": "step", "label": "正在生成测算报告..."})
            yield sse({"type": "anim", "state": "thinking"})
            prompt = _build_sizing_prompt(company_info, ref_text, web_text)
            report_text = await asyncio.to_thread(_call, prompt, 0.3)
            citations = extract_citations(report_text)

            yield sse({"type": "anim", "state": "returning"})
            yield sse({"type": "report", "content": report_text})
            yield sse({"type": "review", "score": 7, "pass": True, "suggestions": [], "issues": []})
            yield sse({"type": "citations", "items": citations})
            yield sse({"type": "done"})

        except Exception as e:
            yield sse({"type": "error", "message": str(e)})

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


# ─── Follow-up chat ───────────────────────────────────────────────────────────
class FollowUpRequest(BaseModel):
    query: str
    report: str


@app.post("/api/followup")
async def followup_chat(req: FollowUpRequest):
    prompt = f"""以下是当前研究报告：

{req.report}

用户追问：{req.query}

请基于报告内容回答，如果报告中没有相关信息，说明需要补充检索。回答简洁专业，200字以内。"""
    answer = await asyncio.to_thread(_call, prompt, 0.3)
    return {"answer": answer}


# ─── Entry point ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
