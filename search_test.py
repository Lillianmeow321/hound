import os
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient

load_dotenv()

# 加载BGE模型
print("加载BGE模型...")
embeddings = HuggingFaceEmbeddings(
    model_name="BAAI/bge-large-zh-v1.5",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True}
)

# 连接已有的向量库
client = QdrantClient(path="./qdrant_db")
vectorstore = QdrantVectorStore(
    client=client,
    collection_name="memos",
    embedding=embeddings
)

# 测试几个不同的查询
queries = [
    "AI陪伴类产品的用户留存策略",
    "Gen AI产品变现模式",
    "Z世代用户行为特征"
]

for query in queries:
    print(f"\n{'='*50}")
    print(f"查询：{query}")
    print('='*50)
    results = vectorstore.similarity_search(query, k=3)
    for i, doc in enumerate(results):
        source = doc.metadata.get('source', '未知').split('/')[-1]
        print(f"\n【结果 {i+1}】{source}")
        print(doc.page_content[:200])
        print("-"*50)