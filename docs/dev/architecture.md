# EduMind Agent 微服务架构开发说明

本文档面向开发，不用于展示包装。它定义从当前单体代码演进到轻量微服务的目标架构、运行拓扑、通信协议和开发约束。

## 当前代码状态

当前项目是 Node.js 原生实现的前后端分离应用，但后端仍是单进程模块化单体。

| 当前文件 | 职责 |
| --- | --- |
| `server/src/main.js` | 启动单个 Node.js HTTP 服务 |
| `server/src/framework/http.js` | 静态文件托管和 API 分发 |
| `server/src/application/controllers.js` | 现有全部 REST API |
| `server/src/application/services.js` | Auth、Learning、AI、Collaboration 应用服务 |
| `server/src/domain/*.js` | 领域对象、Repository、Provider |
| `server/src/infrastructure/jsonDatabase.js` | 单 JSON 文件持久化 |
| `client/` | 原生 Web 前端 |

当前可以描述为“前后端分离 + 领域分层 + 模块化单体”。它不是实际微服务，因为所有业务在同一个进程内运行，共享同一个 `data/app-data.json`。

## 目标架构

目标是轻量微服务，不引入 Spring Cloud、Docker、注册中心、消息队列等重基础设施。每个服务是独立 Node.js 进程，拥有独立入口、路由、应用服务、领域对象和数据文件。

| 服务 | 默认端口 | 职责 |
| --- | ---: | --- |
| `gateway-service` | 4077 | 静态前端、统一入口、鉴权、API 转发、Dashboard 聚合 |
| `identity-service` | 4101 | 用户、角色、登录、Token 签发与校验 |
| `learning-service` | 4102 | 课程、班级、目标、任务、笔记、学习路径 |
| `assessment-service` | 4103 | 作业、提交、Rubric、评分、题库、练习、错题本 |
| `ai-service` | 4104 | Prompt、知识库检索、Mock/LM Studio/OpenAI-compatible Provider |
| `collaboration-service` | 4105 | 协作消息、活动日志、事件接收、SSE 推送 |
| `analytics-service` | 4106 | 学习统计、作业统计、掌握度、教师看板 |

推荐目录：

```text
services/
  gateway-service/src/
  identity-service/src/
  learning-service/src/
  assessment-service/src/
  ai-service/src/
  collaboration-service/src/
  analytics-service/src/
shared/
  http/
  data/
  auth/
  client/
data/
  identity.json
  learning.json
  assessment.json
  ai.json
  collaboration.json
  analytics.json
```

`shared/` 只放稳定基础设施，例如 Router、错误响应、JSON 数据库、内部 HTTP client、用户上下文解析。业务规则不得放入 `shared/`。

## 请求路径

浏览器只访问 Gateway。

```text
Browser -> gateway-service :4077
  /api/auth/*          -> identity-service
  /api/me              -> identity-service
  /api/courses/*       -> learning-service
  /api/goals/*         -> learning-service
  /api/tasks/*         -> learning-service
  /api/notes/*         -> learning-service
  /api/assignments/*   -> assessment-service
  /api/questions/*     -> assessment-service
  /api/practice/*      -> assessment-service
  /api/ai/*            -> ai-service
  /api/collaboration/* -> collaboration-service
  /api/activity        -> collaboration-service
  /api/events          -> collaboration-service
  /api/analytics/*     -> analytics-service
```

服务内部接口统一使用 `/internal/*`，前端不得直接调用。例如：

- `POST /internal/auth/verify`
- `GET /internal/users/:id`
- `GET /internal/learning/context/:userId`
- `POST /internal/ai/review-submission`
- `POST /internal/events`

## 通信协议

所有接口使用 HTTP + JSON。响应格式沿用当前 `ok()` 和 `toHttpError()`。

成功：

```json
{ "ok": true, "data": {} }
```

成功并带元数据：

```json
{ "ok": true, "data": {}, "meta": {} }
```

失败：

```json
{
  "ok": false,
  "code": "VALIDATION_ERROR",
  "message": "请求参数不合法。",
  "details": {}
}
```

标准错误码：

| code | HTTP | 含义 |
| --- | ---: | --- |
| `VALIDATION_ERROR` | 400 | 请求参数、请求体或状态流转不合法 |
| `AUTH_REQUIRED` | 401 | 未登录或 Token 无效 |
| `FORBIDDEN` | 403 | 当前角色无权限 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `INTERNAL_ERROR` | 500 | 未预期服务错误 |

## 鉴权模型

第一阶段继续使用当前 JWT-lite HMAC Token。

1. identity-service 签发 Token。
2. 前端请求 Gateway 时携带 `Authorization: Bearer <token>`。
3. Gateway 调用 `identity-service /internal/auth/verify` 校验。
4. Gateway 转发给下游服务时注入：
   - `x-edumind-user-id`
   - `x-edumind-user-role`
   - `x-edumind-user-name`
   - `x-edumind-internal-key`
5. 下游服务只信任来自 Gateway 的用户上下文头。

本地开发可以允许服务直接校验 Token，但最终目标是 Gateway 统一鉴权。

## 数据策略

迁移初期继续使用 JSON 文件。

规则：

- 每个服务拥有自己的 JSON 文件。
- 服务不得直接读取或修改其他服务的数据文件。
- 跨服务引用只保存 ID。
- 可保存展示快照字段，如 `studentSnapshot`，但快照不能用于权限判断。
- 所有实体保留 `id`、`createdAt`、`updatedAt`。
- 时间统一 ISO 字符串。
- ID 使用语义前缀：`user_`、`goal_`、`assignment_`、`question_`。

## 事件与 SSE

当前单体使用 `DomainEventBus` + `SyncHub`。微服务阶段改为 collaboration-service 统一管理事件和 SSE。

事件发布流程：

1. 业务服务完成本地写操作。
2. 调用 `collaboration-service POST /internal/events`。
3. collaboration-service 保存活动日志和事件。
4. collaboration-service 通过 `/api/events` SSE 推送给前端。

事件格式：

```json
{
  "id": "evt_...",
  "type": "task.completed",
  "actorId": "user_student",
  "source": "learning-service",
  "summary": "完成任务：补充顺序图",
  "payload": { "taskId": "task_1234" },
  "occurredAt": "2026-06-16T00:00:00.000Z"
}
```

第一阶段不引入消息队列；未来需要时，`POST /internal/events` 是替换点。

## 服务内部结构

每个业务服务保持同样分层：

```text
src/
  main.js
  config.js
  routes.js
  application/
  domain/
  infrastructure/
```

约束：

- `domain/` 不依赖 HTTP、文件系统、fetch。
- `application/` 编排用例、权限、Repository、服务 client。
- `routes.js` 只做 HTTP 参数解析和响应。
- `infrastructure/` 放 JSON repository、外部服务 client、Provider。

## 启动模式

保留当前单体命令作为迁移期兜底：

- `npm start`
- `npm test`

新增微服务命令：

- `npm run start:gateway`
- `npm run start:identity`
- `npm run start:learning`
- `npm run start:assessment`
- `npm run start:ai`
- `npm run start:collaboration`
- `npm run start:analytics`
- `npm run start:services:mock`
- `npm run start:services`

## 暂不引入

第一阶段明确不做：

- Docker Compose
- Kubernetes
- 服务注册中心
- 配置中心
- 消息队列
- 分布式事务
- OAuth2 完整流程
- 独立数据库集群

这些可以作为演进方向，但不要留下半成品。

## 架构验收标准

微服务骨架完成时必须满足：

- Gateway 能托管前端。
- `GET /api/health` 能聚合服务健康状态。
- 登录由 identity-service 完成。
- 目标、任务、笔记由 learning-service 完成。
- AI 请求由 ai-service 完成。
- 消息、活动日志、SSE 由 collaboration-service 完成。
- 每个服务有独立数据文件。
- `npm test` 不依赖 LM Studio。
- LM Studio 测试独立运行。

