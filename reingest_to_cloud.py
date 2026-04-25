"""
reingest_to_cloud.py
重新向量化所有文档并写入 Qdrant Cloud（jina-embeddings-v2-base-zh，768维）

用法：python reingest_to_cloud.py
需要 .env 里有 QDRANT_URL 和 QDRANT_API_KEY
"""
import os
import uuid
from pathlib import Path
from dotenv import load_dotenv
from fastembed import TextEmbedding
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
MODEL_NAME = "jinaai/jina-embeddings-v2-base-zh"
VECTOR_DIM = 768
BATCH_SIZE = 32


# ─── Text splitter ────────────────────────────────────────────────────────────
def split_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        chunk = text[start : start + chunk_size]
        if chunk.strip():
            chunks.append(chunk)
        start += chunk_size - overlap
    return chunks


# ─── Load all .md files under a directory ────────────────────────────────────
def load_md_files(root: str) -> list[dict]:
    """Returns list of {text, source} dicts."""
    docs = []
    for path in Path(root).rglob("*.md"):
        try:
            text = path.read_text(encoding="utf-8")
            if text.strip():
                docs.append({"text": text, "source": str(path)})
        except Exception as e:
            print(f"  跳过 {path}：{e}")
    return docs


# ─── Build chunks with metadata ───────────────────────────────────────────────
def make_chunks(docs: list[dict], chunk_size: int, overlap: int) -> list[dict]:
    """Returns list of {text, source} chunks."""
    chunks = []
    for doc in docs:
        for chunk in split_text(doc["text"], chunk_size, overlap):
            chunks.append({"text": chunk, "source": doc["source"]})
    return chunks


# ─── Embed in batches ─────────────────────────────────────────────────────────
def embed_chunks(model: TextEmbedding, chunks: list[dict]) -> list[list[float]]:
    texts = [c["text"] for c in chunks]
    vectors = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        vecs = list(model.embed(batch))
        vectors.extend([v.tolist() for v in vecs])
        print(f"  embedding {min(i + BATCH_SIZE, len(texts))}/{len(texts)}", end="\r")
    print()
    return vectors


# ─── Recreate collection and upsert ──────────────────────────────────────────
def recreate_and_upsert(client: QdrantClient, collection: str,
                        chunks: list[dict], vectors: list[list[float]]) -> None:
    if client.collection_exists(collection):
        client.delete_collection(collection)
        print(f"  已删除旧 collection: {collection}")

    client.create_collection(
        collection_name=collection,
        vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
    )
    print(f"  已创建 collection: {collection}（{VECTOR_DIM}维）")

    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=vec,
            payload={
                "page_content": chunk["text"],
                "metadata": {"source": chunk["source"]},
            },
        )
        for chunk, vec in zip(chunks, vectors)
    ]

    # upsert in batches
    for i in range(0, len(points), BATCH_SIZE):
        client.upsert(collection_name=collection, points=points[i : i + BATCH_SIZE])
    print(f"  写入 {len(points)} 条向量")


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    print(f"连接 Qdrant Cloud: {QDRANT_URL}")
    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

    print(f"\n加载 FastEmbed 模型：{MODEL_NAME}（首次运行会下载模型）...")
    model = TextEmbedding(model_name=MODEL_NAME)
    print("✓ 模型加载完成")

    # ── memos collection ──────────────────────────────────────────────────────
    print("\n[1/2] 处理 memos collection")
    memo_docs = load_md_files("./data/memo")
    print(f"  读取 {len(memo_docs)} 篇文档")
    memo_chunks = make_chunks(memo_docs, chunk_size=500, overlap=50)
    print(f"  切分成 {len(memo_chunks)} 个chunk")
    print("  embedding...")
    memo_vecs = embed_chunks(model, memo_chunks)
    recreate_and_upsert(client, "memos", memo_chunks, memo_vecs)
    print("✓ memos 完成")

    # ── market_sizing collection ──────────────────────────────────────────────
    print("\n[2/2] 处理 market_sizing collection")
    sizing_path = "./data/memo/Market sizing.md"
    sizing_text = Path(sizing_path).read_text(encoding="utf-8")
    sizing_chunks = [
        {"text": t, "source": sizing_path}
        for t in split_text(sizing_text, chunk_size=800, overlap=100)
        if t.strip()
    ]
    print(f"  切分成 {len(sizing_chunks)} 个chunk")
    print("  embedding...")
    sizing_vecs = embed_chunks(model, sizing_chunks)
    recreate_and_upsert(client, "market_sizing", sizing_chunks, sizing_vecs)
    print("✓ market_sizing 完成")

    print("\n✅ 全部完成！两个 collection 已用 768 维重新写入 Qdrant Cloud。")


if __name__ == "__main__":
    main()
