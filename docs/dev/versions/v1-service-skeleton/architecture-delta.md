# v1 架构变化

v1 相对 v0 新增微服务骨架，但不迁移业务。

## 新增目录

```text
shared/
  http/
  data/
  domain/
  client/
  auth/
services/
  gateway-service/
  identity-service/
  learning-service/
  assessment-service/
  ai-service/
  collaboration-service/
  analytics-service/
```

## shared 模块

| 模块 | 目标 |
| --- | --- |
| `shared/http/router.js` | 从当前 Router 抽取，供各服务复用 |
| `shared/http/response.js` | 统一 `ok`、`sendJson`、`readJson` |
| `shared/http/errors.js` | 统一 AppError 和 HTTP 错误映射 |
| `shared/http/server.js` | 创建标准 Node HTTP 服务 |
| `shared/data/jsonDatabase.js` | JSON 文件持久化 |
| `shared/domain/entity.js` | `Entity` 基类 |
| `shared/data/repository.js` | `Repository` 基类 |
| `shared/client/serviceClient.js` | 服务间 HTTP 调用 |
| `shared/auth/userContext.js` | 读取用户上下文、校验内部密钥 |

## 服务骨架

每个服务至少包含：

```text
src/
  main.js
  config.js
  routes.js
```

每个服务至少暴露：

```http
GET /health
```

## Gateway 初始职责

- 托管 `client/`。
- `GET /api/health` 聚合服务状态。
- 为后续 API 转发准备 proxy/client。

## 端口

| 服务 | 端口 |
| --- | ---: |
| gateway-service | 4077 |
| identity-service | 4101 |
| learning-service | 4102 |
| assessment-service | 4103 |
| ai-service | 4104 |
| collaboration-service | 4105 |
| analytics-service | 4106 |

