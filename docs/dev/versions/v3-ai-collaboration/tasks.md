# v3 任务清单

## 1. ai-service

- [ ] 新增 `services/ai-service/src/domain/ai.js`。
- [ ] 新增 `services/ai-service/src/application/aiTutorService.js`。
- [ ] 新增 `services/ai-service/src/infrastructure/seed.js`。
- [ ] 新增 `services/ai-service/src/infrastructure/clients/learningClient.js`。
- [ ] 新增 `services/ai-service/src/infrastructure/knowledge/resourceSearch.js`。
- [ ] 通过 `resourceSearch.js` 复用手写课程知识库检索能力。
- [ ] 在 config 中加入 LLM provider、endpoint、model、timeout、maxTokens、dataFile、服务 URL。
- [ ] 实现 `POST /api/ai/ask`。
- [ ] 实现 `POST /api/ai/plan`。
- [ ] 实现 `POST /api/ai/summarize`。
- [ ] 实现 `GET /internal/ai/provider-health`。
- [ ] 记录 AI request/response。

## 2. collaboration-service

- [ ] 新增 `services/collaboration-service/src/domain/collaboration.js`。
- [ ] 新增 `services/collaboration-service/src/application/activityService.js`。
- [ ] 新增 `services/collaboration-service/src/application/collaborationService.js`。
- [ ] 新增 `services/collaboration-service/src/application/syncHub.js`。
- [ ] 新增 `services/collaboration-service/src/infrastructure/seed.js`。
- [ ] 在 config 中加入 `dataFile`。
- [ ] 实现 `GET /api/collaboration/messages`。
- [ ] 实现 `POST /api/collaboration/messages`。
- [ ] 实现 `GET /api/activity`。
- [ ] 实现 `GET /api/events`。
- [ ] 实现 `POST /internal/events`。

## 3. learning-service

- [ ] 新增 collaboration-service client。
- [ ] 在 config 中加入 `COLLABORATION_SERVICE_URL`。
- [ ] `createGoal` 成功后发布 `goal.created`。
- [ ] `createTask` 成功后发布 `task.created`。
- [ ] `completeTask` 成功后发布 `task.completed`。
- [ ] `createNote` 成功后发布 `note.created`。
- [ ] 事件发布失败不能回滚主业务。

## 4. Gateway

- [ ] 新增 ai-service client。
- [ ] 新增 collaboration-service client。
- [ ] 代理 `/api/ai/ask`。
- [ ] 代理 `/api/ai/plan`。
- [ ] 代理 `/api/ai/summarize`。
- [ ] 代理 `/api/collaboration/messages` GET/POST。
- [ ] 代理 `/api/activity`。
- [ ] 代理 `/api/events` SSE。
- [ ] `/api/dashboard` 聚合 activity logs。
- [ ] `/api/dashboard` meta provider 来自 ai-service provider health。

## 5. 数据

- [ ] 新增 `data/ai.json` seed 逻辑。
- [ ] 新增 `data/collaboration.json` seed 逻辑。
- [ ] 确认 ai-service 不直接读取 `data/learning.json`。
- [ ] 确认 Gateway 不直接读取服务数据文件。

## 6. 测试

- [ ] ai-service Mock 问答测试。
- [ ] ai-service 学习计划测试。
- [ ] ai-service 笔记摘要测试。
- [ ] ai-service provider health 测试。
- [ ] collaboration-service 消息测试。
- [ ] collaboration-service activity 测试。
- [ ] collaboration-service internal event 测试。
- [ ] SSE ready 事件测试。
- [ ] learning-service 发布事件测试。
- [ ] Gateway AI 代理测试。
- [ ] Gateway 协作代理测试。
- [ ] Gateway dashboard 聚合 activity/provider 测试。
- [ ] v1/v2 测试仍通过。

## 7. 文档同步

- [ ] 如果接口实现和本版本文档不同，先改文档。
- [ ] v3 完成后勾选 `acceptance.md`。

