# v8 任务清单

## 1. v7 遗留修复

- [ ] 修复学生带 token 启动时默认路由不进入 `student-ai` 的问题。
- [ ] 扫描 `client/src/views/student/*.js`。
- [ ] 所有 AI、后端、用户文本使用 `escapeHtml`。
- [ ] 所有 HTML attribute 使用 `attr`。
- [ ] 增加测试覆盖 student 默认路由。
- [ ] 增加测试覆盖 student view 不直接输出未转义危险文本。

## 2. ai-service Student AI workflow

- [ ] 新增 `studentAiWorkflowService.js`。
- [ ] 新增 `studentAiPrompts.js`。
- [ ] 新增 `studentAiSchemas.js`。
- [ ] 新增 `studentAiFallbacks.js`。
- [ ] 实现 `buildDailyPlan`。
- [ ] 实现 `buildWeaknessInsight`。
- [ ] 实现 `draftTask`。
- [ ] 实现 `guideAssignment`。
- [ ] 实现 `checkSubmission`。
- [ ] 实现 `organizeNote`。
- [ ] provider 调用失败时使用 fallback。
- [ ] JSON 解析失败时使用 fallback。

## 3. ai-service routes

- [ ] `POST /api/student-ai/daily-plan`。
- [ ] `POST /api/student-ai/weakness-insight`。
- [ ] `POST /api/student-ai/task-drafts`。
- [ ] `POST /api/student-ai/assignment-guide`。
- [ ] `POST /api/student-ai/submission-check`。
- [ ] `POST /api/student-ai/note-organize`。
- [ ] 所有 route 使用 `requireUserContext(req)`。
- [ ] 所有 route 返回 `ok(data)`。

## 4. Gateway 代理

- [ ] Gateway 代理 `daily-plan`。
- [ ] Gateway 代理 `weakness-insight`。
- [ ] Gateway 代理 `task-drafts`。
- [ ] Gateway 代理 `assignment-guide`。
- [ ] Gateway 代理 `submission-check`。
- [ ] Gateway 代理 `note-organize`。
- [ ] 代理时传递用户上下文。

## 5. 前端 ApiClient 和 Adapter

- [ ] `ApiClient.studentAiDailyPlan(input)`。
- [ ] `ApiClient.studentAiWeaknessInsight(input)`。
- [ ] `ApiClient.studentAiTaskDraft(input)`。
- [ ] `ApiClient.studentAiAssignmentGuide(input)`。
- [ ] `ApiClient.studentAiSubmissionCheck(input)`。
- [ ] `ApiClient.studentAiNoteOrganize(input)`。
- [ ] `StudentAiAdapter.buildDailyPlan` 优先调用正式 API。
- [ ] `StudentAiAdapter.buildWeaknessInsight` 优先调用正式 API。
- [ ] `StudentAiAdapter.draftLearningTask` 优先调用正式 API。
- [ ] `StudentAiAdapter.guideAssignment` 优先调用正式 API。
- [ ] `StudentAiAdapter.checkSubmissionDraft` 优先调用正式 API。
- [ ] `StudentAiAdapter.organizeNote` 优先调用正式 API。
- [ ] 正式 API 失败时保留 v7 fallback。

## 6. 测试

- [ ] ai-service student AI workflow 单元/服务测试。
- [ ] Gateway student AI 代理测试。
- [ ] ApiClient path 测试。
- [ ] StudentAiAdapter 正式 API 成功路径测试。
- [ ] StudentAiAdapter fallback 路径测试。
- [ ] v7 student views import 测试继续通过。
- [ ] `npm test` 通过。
- [ ] `npm run test:services` 通过。

