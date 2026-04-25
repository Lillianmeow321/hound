"""
把本地qdrant_db迁移到Qdrant Cloud
运行前先在.env里加：
QDRANT_URL=你的云端URL
QDRANT_API_KEY=你的API Key
"""

import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

if not QDRANT_URL or not QDRANT_API_KEY:
    print("❌ 请先在.env里加入 QDRANT_URL 和 QDRANT_API_KEY")
    exit()

# 连接本地
print("连接本地Qdrant...")
local_client = QdrantClient(path="./qdrant_db")

# 连接云端
print("连接Qdrant Cloud...")
cloud_client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY
)

COLLECTIONS = [
    {"name": "memos", "size": 1024},
    {"name": "market_sizing", "size": 1024}
]

for col in COLLECTIONS:
    name = col["name"]
    size = col["size"]

    # 检查本地collection是否存在
    if not local_client.collection_exists(name):
        print(f"⟳ 跳过 {name}（本地不存在）")
        continue

    print(f"\n📦 迁移 {name}...")

    # 云端创建collection（如果已存在先删掉）
    if cloud_client.collection_exists(name):
        cloud_client.delete_collection(name)
        print(f"  已删除云端旧的 {name}")

    cloud_client.create_collection(
        collection_name=name,
        vectors_config=VectorParams(size=size, distance=Distance.COSINE)
    )
    print(f"  ✓ 云端 {name} 创建成功")

    # 分批读取本地数据并上传
    batch_size = 100
    offset = None
    total = 0

    while True:
        results, next_offset = local_client.scroll(
            collection_name=name,
            limit=batch_size,
            offset=offset,
            with_vectors=True,
            with_payload=True
        )

        if not results:
            break

        points = [
            PointStruct(
                id=point.id,
                vector=point.vector,
                payload=point.payload
            )
            for point in results
        ]

        cloud_client.upsert(
            collection_name=name,
            points=points
        )

        total += len(points)
        print(f"  上传进度：{total} 条")

        if next_offset is None:
            break
        offset = next_offset

    print(f"  ✅ {name} 迁移完成，共 {total} 条向量")

print("\n🎉 全部迁移完成！")

# 验证
print("\n验证云端数据...")
for col in COLLECTIONS:
    name = col["name"]
    if cloud_client.collection_exists(name):
        info = cloud_client.get_collection(name)
        print(f"  {name}：{info.points_count} 条向量 ✓")