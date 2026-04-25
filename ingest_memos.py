import os
from dotenv import load_dotenv
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

load_dotenv()

# 加载所有md文件
loader = DirectoryLoader(
    "./data/memo",
    glob="**/*.md",
    loader_cls=TextLoader,
    loader_kwargs={"encoding": "utf-8"},
    recursive=True
)
docs = loader.load()
print(f"✓ 加载了 {len(docs)} 篇文档")

# 切分成chunk
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(docs)
print(f"✓ 切分成 {len(chunks)} 个chunk")

# BGE中文embedding模型
print("加载BGE模型（第一次会下载约1.3GB，请耐心等待）...")
embeddings = HuggingFaceEmbeddings(
    model_name="BAAI/bge-large-zh-v1.5",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True}
)
print("✓ BGE模型加载完成")

# 初始化qdrant，如果collection已存在就删掉重建
client = QdrantClient(path="./qdrant_db")
if client.collection_exists("memos"):
    client.delete_collection("memos")
    print("✓ 已删除旧的collection")

client.create_collection(
    collection_name="memos",
    vectors_config=VectorParams(size=1024, distance=Distance.COSINE)
)

# 写入向量
vectorstore = QdrantVectorStore(
    client=client,
    collection_name="memos",
    embedding=embeddings
)
vectorstore.add_documents(chunks)
print(f"✓ 向量化完成，已存入 ./qdrant_db")
print(f"✓ 共 {len(chunks)} 条向量")