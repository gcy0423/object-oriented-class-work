# v8 验收清单

## 文档

- [ ] README、scope、architecture-delta、api-delta、data-delta、tasks、test-plan、acceptance、implementation-prompt、code-blueprint 均存在。
- [ ] 文档明确 v8 承接 v7 student-ai-first。
- [ ] 文档明确 v7 遗留修复范围。
- [ ] 文档明确不要求真实模型调试。

## v7 遗留修复

- [ ] 学生无 hash、带 token 启动默认进入 `student-ai`。
- [ ] student views 没有明显未转义 AI/后端/用户文本。
- [ ] 新增测试覆盖默认路由。
- [ ] 新增测试覆盖文本转义。

## 后端 AI Workflow

- [ ] ai-service 有 StudentAiWorkflowService。
- [ ] daily-plan workflow 可用。
- [ ] weakness-insight workflow 可用。
- [ ] task-drafts workflow 可用。
- [ ] assignment-guide workflow 可用。
- [ ] submission-check workflow 可用。
- [ ] note-organize workflow 可用。
- [ ] provider 失败时 fallback。
- [ ] JSON 解析失败时 fallback。

## Gateway

- [ ] Gateway 代理 6 个 `/api/student-ai/*`。
- [ ] 代理传递用户上下文。
- [ ] 代理失败返回统一错误格式。

## 前端

- [ ] ApiClient 有 6 个 student AI 方法。
- [ ] StudentAiAdapter 优先调用正式 API。
- [ ] StudentAiAdapter 保留 fallback。
- [ ] AI 学习台使用正式 daily-plan。
- [ ] AI 分析结果页使用正式 weakness-insight。
- [ ] 作业详情页使用正式 assignment-guide。
- [ ] 提交页使用正式 submission-check。
- [ ] 笔记整理页使用正式 note-organize。

## 测试

- [ ] `npm test` 通过。
- [ ] `npm run test:services` 通过。
- [ ] 普通测试不依赖 LM Studio。
- [ ] 普通测试不依赖外网。

