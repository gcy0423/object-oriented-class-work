# v3 验收清单

## ai-service

- [ ] AI 领域对象已迁移。
- [ ] Prompt 模板已迁移。
- [ ] Mock Provider 已迁移。
- [ ] LM Studio Provider 已迁移。
- [ ] OpenAI-compatible Provider 已迁移。
- [ ] 本地知识库已迁入 ai-service。
- [ ] `/api/ai/ask` 可用。
- [ ] `/api/ai/plan` 可用。
- [ ] `/api/ai/summarize` 可用。
- [ ] `/internal/ai/provider-health` 可用。
- [ ] 使用 `data/ai.json`。

## collaboration-service

- [ ] 协作领域对象已迁移。
- [ ] 消息服务已迁移。
- [ ] 活动日志服务已迁移。
- [ ] SSE SyncHub 已迁移。
- [ ] `/api/collaboration/messages` GET/POST 可用。
- [ ] `/api/activity` 可用。
- [ ] `/api/events` 可用。
- [ ] `/internal/events` 可用。
- [ ] 使用 `data/collaboration.json`。

## learning-service

- [ ] 创建目标后发布 `goal.created`。
- [ ] 创建任务后发布 `task.created`。
- [ ] 完成任务后发布 `task.completed`。
- [ ] 创建笔记后发布 `note.created`。
- [ ] 事件发布失败不回滚主业务。

## Gateway

- [ ] `/api/ai/ask` 代理到 ai-service。
- [ ] `/api/ai/plan` 代理到 ai-service。
- [ ] `/api/ai/summarize` 代理到 ai-service。
- [ ] `/api/collaboration/messages` 代理到 collaboration-service。
- [ ] `/api/activity` 代理到 collaboration-service。
- [ ] `/api/events` 代理到 collaboration-service SSE。
- [ ] `/api/dashboard` 聚合 activity logs。
- [ ] `/api/dashboard` meta provider 来自 ai-service。
- [ ] Gateway 不直接读取 ai/collaboration 数据文件。

## 兼容

- [ ] 前端 AI 页面 API 路径不变。
- [ ] 前端协作页面 API 路径不变。
- [ ] 前端总览活动展示恢复。
- [ ] 旧单体 `npm start` 仍可用。
- [ ] 旧普通测试 `npm test` 仍可用。

## 边界

- [ ] 未新增作业、题库、评分。
- [ ] 未新增 analytics 统计。
- [ ] 未引入数据库、消息队列、Docker。
- [ ] 未删除旧单体代码。

## 测试

- [ ] ai-service 测试通过。
- [ ] collaboration-service 测试通过。
- [ ] learning-service 事件测试通过。
- [ ] Gateway v3 集成测试通过。
- [ ] v1/v2 测试仍通过。
- [ ] LM Studio 测试可独立运行。

