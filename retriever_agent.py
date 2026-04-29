import os
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from planner_agent import plan_research

load_dotenv()

# 加载向量库
print("加载BGE模型...")
embeddings = HuggingFaceEmbeddings(
    model_name="BAAI/bge-large-zh-v1.5",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True}
)
client = QdrantClient(path="./qdrant_db")
vectorstore = QdrantVectorStore(
    client=client,
    collection_name="memos",
    embedding=embeddings
)

from web_search import search_web

def retrieve_for_dimensions(dimensions: list) -> dict:
    results = {}
    for dim in dimensions:
        name = dim["name"]
        query = dim["query"]
        
        # 私有知识库检索
        private_docs = vectorstore.similarity_search(query, k=2)
        private_results = [
            {
                "source": doc.metadata.get("source", "").split("/")[-1],
                "content": doc.page_content[:300],
                "type": "私有知识库"
            }
            for doc in private_docs
        ]
        
        # 联网搜索：优先拉最近90天（覆盖2026年）
        print(f"  🌐 联网搜索：{name}")
        web_results = search_web(query, max_results=3, days=90)
        for r in web_results:
            r["type"] = "联网搜索"

        # 不足2条时补充过去一年的数据，标记为"历史参考"
        if len(web_results) < 2:
            print(f"  ⚠️  {name} 近期数据不足({len(web_results)}条)，补充历史搜索...")
            existing_urls = {r["source"] for r in web_results}
            fallback = search_web(query, max_results=3, days=365)
            for r in fallback:
                if r["source"] not in existing_urls:
                    r["type"] = "历史参考"
                    web_results.append(r)

        recent = sum(1 for r in web_results if r["type"] == "联网搜索")
        hist   = sum(1 for r in web_results if r["type"] == "历史参考")
        results[name] = private_results + web_results
        print(f"  ✓ {name}：知识库{len(private_results)}条 + 近期联网{recent}条 + 历史参考{hist}条")
    
    return results

if __name__ == "__main__":
    query = input("请输入研究方向：\n> ").strip()
    print(f"\n规划中...\n")
    plan = plan_research(query)
    
    print(f"\n开始检索{len(plan['dimensions'])}个维度...\n")
    results = retrieve_for_dimensions(plan["dimensions"])
    
    print("\n" + "="*50)
    print("检索结果预览：")
    for dim_name, docs in results.items():
        print(f"\n【{dim_name}】")
        for doc in docs:
            print(f"  来源：{doc['source']}")
            print(f"  内容：{doc['content'][:100]}...")