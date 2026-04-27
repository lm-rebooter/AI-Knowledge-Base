# Deployment

## 本地开发

```bash
docker compose up -d postgres redis
pnpm install
pnpm dev
```

## 建议部署方式

- `web`: Vercel 或 Docker
- `api`: Docker + ECS / Railway / Render / Fly.io
- `ai-service`: Docker + GPU/CPU runtime
- `postgres`: Supabase / Neon / RDS
- `redis`: Upstash / ElastiCache

## 生产注意事项

- JWT 密钥必须使用强随机值
- 文件上传建议接入对象存储
- 大模型和 Embedding 需要做好成本控制与限流
- 知识库文档需要权限和租户隔离
