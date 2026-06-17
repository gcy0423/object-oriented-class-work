# v1-service-skeleton

v1 目标是建立轻量微服务骨架，不迁移核心业务。完成后项目应同时保留当前单体启动方式，并新增可独立启动的服务目录、共享基础设施、Gateway 和健康检查。

## 版本目标

- 新增 `shared/` 基础设施。
- 新增 `services/` 服务目录。
- 新增 Gateway 服务。
- 新增各服务 `GET /health`。
- 新增服务间 HTTP client 基础能力。
- 新增内部用户上下文和内部密钥约定。
- 保留 `npm start`、`npm test`。

## 本版本不做

- 不迁移登录业务。
- 不迁移学习业务。
- 不迁移 AI 业务。
- 不迁移 SSE。
- 不拆分 `data/app-data.json`。
- 不新增 assessment/analytics 业务功能。

## 目标启动命令

```bash
npm run start:gateway
npm run start:identity
npm run start:learning
npm run start:assessment
npm run start:ai
npm run start:collaboration
npm run start:analytics
npm run start:services:mock
```

## 版本完成标准

- 每个服务能独立返回健康检查。
- Gateway 能聚合所有服务健康状态。
- Gateway 能托管当前 `client/` 静态资源。
- 单体原有启动和测试不被破坏。
- 文档与新增目录结构一致。

