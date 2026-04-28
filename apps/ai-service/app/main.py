"""
AI Knowledge Base - FastAPI 主入口

【项目定位】
这是一个专门负责 AI 能力的服务端点：
- 文档入库（Ingestion）：接收文本内容，切片、向量化后存入向量数据库
- RAG 问答（Retrieval Augmented Generation）：检索相关片段，结合 LLM 生成答案

【为什么单独拆出一个 AI 服务？】
1. 隔离关注点：AI 相关的依赖（Python 生态、GPU 配置）和主后端解耦
2. 独立扩展：AI 服务通常需要更多计算资源，可以单独部署
3. 技术栈适配：Python 在 AI/ML 领域生态更成熟（LangChain、LlamaIndex 等）

【技术选型说明】
- FastAPI：现代 Python Web 框架，支持异步、自动文档生成
- Pydantic：数据验证和序列化
"""
from fastapi import FastAPI

from app.api.chat import router as chat_router
from app.api.health import router as health_router
from app.api.ingest import router as ingest_router

app = FastAPI(
    title="AI Knowledge Base Service",
    description="文档入库与 RAG 问答服务",
    version="0.1.0",
)

# 【路由组织策略】
# 采用子路由挂载的方式，保持代码模块化：
# - health_router: 健康检查（用于 K8s/负载均衡探测）
# - ingest_router: 文档入库流程
# - chat_router: RAG 问答流程
#
# 随着项目发展，可以按需添加新的路由组：
# - /api/search: 全文搜索
# - /api/rerank: 重排模型
# - /api/ocr: OCR 识别
app.include_router(health_router, prefix="/api")
app.include_router(ingest_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
