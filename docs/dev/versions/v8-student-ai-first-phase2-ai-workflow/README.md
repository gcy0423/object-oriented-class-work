# v8-student-ai-first-phase2-ai-workflow

v8 第二阶段承接 v7 学生端 AI-first 前端。v7 已经把 `student-ai-first-v2` 原型落成真实学生端页面，并用 `StudentAiAdapter` 以 fallback 方式模拟 AI-first 能力；v8 的目标是把这些 fallback 能力升级为正式后端 AI 工作流。

本阶段优先修复 v7 遗留质量问题，然后在现有 `ai-service` 和 Gateway 中新增 `/api/student-ai/*` 接口。AI 能力仍以 prompt + structured JSON output 为核心，允许使用 mock provider 和 fallback，不要求真实调试 LangChain 或 LM Studio 效果。

## 版本目标

- 修复 v7 遗留：学生带 token 启动时默认进入 `student-ai`。
- 修复 v7 遗留：`client/src/views/student/*.js` 中 AI、后端、用户文本统一转义。
- 在 `ai-service` 中新增学生端 AI workflow 应用层。
- Gateway 代理 `/api/student-ai/*`。
- 前端 `StudentAiAdapter` 优先调用正式 `/api/student-ai/*`，失败时继续 fallback 到本地结构化结果。
- 实现 6 个学生端 AI 工作流：
  - AI 今日建议。
  - 薄弱点分析。
  - 学习任务草稿。
  - 作业拆解。
  - 提交前自检。
  - 笔记整理。
- 所有 AI 输出使用稳定 JSON schema，不直接把自然语言当业务数据。
- 增加服务测试和前端 adapter 测试。

## 本版本不做

- 不新增独立 `student-ai-service`；先放在现有 `ai-service`。
- 不要求真实 LangChain runtime 调试通过。
- 不要求 LM Studio 在线。
- 不实现完整 AI 多轮会话持久化。
- 不实现真实附件上传。
- 不实现提交草稿跨刷新持久化；除非本阶段任务提前完成。
- 不改教师端 AI-first 原型。
- 不引入前端构建链或前端框架。

## 新增后端接口

```text
POST /api/student-ai/daily-plan
POST /api/student-ai/weakness-insight
POST /api/student-ai/task-drafts
POST /api/student-ai/assignment-guide
POST /api/student-ai/submission-check
POST /api/student-ai/note-organize
```

## 目标启动命令

```bash
npm run start:services:mock
npm run test:services
npm test
```

浏览器访问：

```text
http://127.0.0.1:4077/
```

## 版本完成标准

- 学生无 hash、带 token 启动时进入 `student-ai`。
- student 视图中所有 AI/后端/用户文本都经过 `escapeHtml` 或 `attr`。
- Gateway 可代理 6 个 `/api/student-ai/*` 接口。
- `ai-service` 可在 mock/fallback 模式下返回符合 schema 的结构化结果。
- 前端 `StudentAiAdapter` 优先调用正式接口，失败后 fallback。
- AI 学习台、AI 分析结果、作业拆解、提交自检、笔记整理不再只依赖 `/api/ai/ask`。
- `npm test` 和 `npm run test:services` 通过。

