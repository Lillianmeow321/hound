from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

print('加载文件...')
loader = TextLoader('./data/memo/Market sizing.md', encoding='utf-8')
docs = loader.load()

splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
chunks = splitter.split_documents(docs)
print(f'切分成 {len(chunks)} 个chunk')

print('加载BGE模型...')
embeddings = HuggingFaceEmbeddings(
    model_name='BAAI/bge-large-zh-v1.5',
    model_kwargs={'device': 'cpu'},
    encode_kwargs={'normalize_embeddings': True}
)

client = QdrantClient(path='./qdrant_db')
if client.collection_exists('market_sizing'):
    client.delete_collection('market_sizing')
client.create_collection(
    collection_name='market_sizing',
    vectors_config=VectorParams(size=1024, distance=Distance.COSINE)
)
print('collection创建成功')

vs = QdrantVectorStore(client=client, collection_name='market_sizing', embedding=embeddings)
vs.add_documents(chunks)
print('向量化完成！')