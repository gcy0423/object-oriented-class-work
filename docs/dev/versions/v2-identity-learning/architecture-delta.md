# v2 架构变化

v2 相对 v1 的变化是：identity-service 和 learning-service 从空 health 服务变成拥有真实业务能力的服务，Gateway 从健康检查聚合扩展为业务入口。

## 新目标拓扑

```text
Browser
  -> gateway-service :4077
      -> identity-service :4101
          -> data/identity.json
      -> learning-service :4102
          -> data/learning.json
```

仍暂不接入：

```text
ai-service
collaboration-service
assessment-service
analytics-service
```

这些服务在 v2 只保留 `/health`。

## identity-service 内部结构

```text
services/identity-service/src/
  main.js
  config.js
  routes.js
  domain/
    identity.js
  application/
    authService.js
  infrastructure/
    seed.js
```

职责：

- 用户演示登录。
- 新用户自动创建。
- Token 签发。
- Token 校验。
- 当前用户读取。
- 内部用户查询。

## learning-service 内部结构

```text
services/learning-service/src/
  main.js
  config.js
  routes.js
  domain/
    learning.js
  application/
    learningService.js
  infrastructure/
    seed.js
```

职责：

- 课程列表。
- 学习目标创建。
- 学习任务创建。
- 任务完成。
- 笔记创建。
- 学习 Dashboard 数据。

## Gateway 新职责

v2 Gateway 需要新增：

- `POST /api/auth/login` 代理。
- `GET /api/me` 代理。
- Token 校验 helper。
- 用户上下文注入 helper。
- learning-service 代理。
- `/api/dashboard` 聚合。

Gateway 不直接读取 `data/identity.json` 或 `data/learning.json`。

## 数据文件变化

```text
data/identity.json
data/learning.json
```

`data/app-data.json` 保留给旧单体使用。

## 事件变化

v2 暂不接入跨服务事件。learning-service 可以内部保留“未来要发布事件”的预留结构，但不能调用尚未实现的 collaboration-service 业务接口。

## 与 v3 的连接点

v3 迁移 AI 和协作时，需要依赖 v2 提供：

- `POST /internal/auth/verify`
- `GET /internal/users/:id`
- `GET /internal/learning/context/:userId`
- learning-service 中稳定的目标、任务、笔记数据结构。
