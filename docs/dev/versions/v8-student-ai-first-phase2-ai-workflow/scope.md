# v8 第二阶段范围

## 做什么

- 修复 v7 学生端默认路由问题。
- 修复 v7 学生端视图未转义文本问题。
- 在 `ai-service` 增加 student AI workflow application 层。
- 增加 student AI prompt builders。
- 增加 student AI output schema normalizers。
- 增加 student AI fallback builders。
- 增加 `/api/student-ai/*` 路由。
- 在 Gateway 中代理 `/api/student-ai/*`。
- 前端 `ApiClient` 增加 student AI 方法。
- 前端 `StudentAiAdapter` 从本地 fallback 迁移为优先调用正式 API。
- 增加服务测试，覆盖 ai-service 和 Gateway student AI API。
- 增加前端测试，覆盖 adapter fallback 和正式 API path。

## 不做什么

- 不新增独立服务目录。
- 不新增真实数据库。
- 不强制持久化 `studentAiResults`。
- 不强制持久化 `studentTaskDrafts`；本阶段先返回草稿，由前端确认后调用现有 task API。
- 不实现笔记 CRUD 后端。
- 不实现提交草稿后端。
- 不实现文件上传。
- 不引入 LangChain npm 依赖作为必需依赖；可以按 LangChain 思路组织 prompt/chain，但普通测试不能依赖外部包。
- 不要求真实模型输出质量验收。

## 兼容要求

- v7 学生端页面和路由保持可用。
- `StudentAiAdapter` 方法签名不变。
- v7 fallback 行为保留。
- `/api/ai/ask`、`/api/ai/plan`、`/api/ai/summarize` 保持可用。
- `npm test` 不依赖 LM Studio。
- `npm run test:services` 不依赖外网和真实模型。

## AI 输出约束

- 返回 JSON object，不返回 HTML。
- 每个接口必须有 schema normalize。
- 每个接口必须有 fallback。
- 每个接口必须包含 `provider` 和 `generatedAt`。
- 所有 action card 必须包含稳定 `type`，不能只给自然语言 label。
- 后端可以保留 `rawText` 供调试，但前端主 UI 不依赖 `rawText`。

## 前端安全约束

- 所有来自 AI、后端、用户输入的文本进入 HTML 前必须转义。
- HTML attribute 使用 `attr()` 或等价函数。
- 允许明确的内部静态 HTML 模板不转义。
- 不允许在 student views 中直接插入 `rawText`。

