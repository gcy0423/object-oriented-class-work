# v3 架构变化

v3 相对 v2 的变化是：ai-service 和 collaboration-service 从 health 骨架变成真实业务服务，Gateway 对外恢复 AI 与协作相关 API，learning-service 开始向 collaboration-service 发布内部事件。

## 新目标拓扑

```text
Browser
  -> gateway-service :4077
      -> identity-service :4101
          -> data/identity.json
      -> learning-service :4102
          -> data/learning.json
      -> ai-service :4104
          -> data/ai.json
          -> learning-service /internal/learning/context/:userId
      -> collaboration-service :4105
          -> data/collaboration.json
```

仍暂不接入真实业务：

```text
assessment-service
analytics-service
```

## ai-service 内部结构

```text
services/ai-service/src/
  main.js
  config.js
  routes.js
  domain/
    ai.js
  application/
    aiTutorService.js
  infrastructure/
    seed.js
    knowledge/
      resourceSearch.js
    clients/
      learningClient.js
```

职责：

- 渲染 Prompt 模板。
- 根据 provider 配置选择 Mock、LM Studio、OpenAI-compatible。
- 调用 learning-service 获取用户学习上下文。
- 通过 resourceSearch 查询手写本地课程知识库。
- 生成问答、计划、摘要。
- 保存 AI 调用记录。
- 暴露 provider health。

## collaboration-service 内部结构

```text
services/collaboration-service/src/
  main.js
  config.js
  routes.js
  domain/
    collaboration.js
  application/
    activityService.js
    collaborationService.js
    syncHub.js
  infrastructure/
    seed.js
```

职责：

- 管理协作消息。
- 记录活动日志。
- 接收内部领域事件。
- 对前端提供 SSE 长连接。
- 广播事件给 SSE 客户端。

## Gateway 新职责

v3 Gateway 需要新增：

- 代理 `/api/ai/ask`。
- 代理 `/api/ai/plan`。
- 代理 `/api/ai/summarize`。
- 代理 `/api/collaboration/messages`。
- 代理 `/api/activity`。
- 代理 `/api/events` SSE。
- Dashboard 聚合 activity logs。
- Dashboard meta provider 来自 ai-service。

Gateway 仍不能直接读取服务数据文件。

## learning-service 变化

learning-service 增加 collaboration-service client，在以下操作后发布事件：

- `goal.created`
- `task.created`
- `task.completed`
- `note.created`

发布事件失败时：

- 不回滚主业务写入。
- 记录警告。
- 当前 API 仍返回主业务结果。

## 数据文件变化

```text
data/ai.json
data/collaboration.json
```

`data/app-data.json` 继续保留给旧单体使用。

## 与 v4 的连接点

v4 assessment-service 将依赖 v3 提供：

- `POST /internal/ai/review-submission`，v3 可先不实现。
- `POST /internal/events`。
- collaboration-service 的活动日志和 SSE。
- ai-service 的 Provider、Prompt、调用记录基础设施。

