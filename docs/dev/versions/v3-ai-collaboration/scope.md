# v3 范围

## 做什么

- 迁移 `PromptTemplate`、`AIResponse`、`MockLLMProvider`、`OpenAICompatibleProvider`、`LMStudioProvider`。
- 迁移 `AITutorService` 中课程问答、学习计划、笔记摘要逻辑。
- 将本地课程知识库检索能力接入 ai-service，保留手写、可审查的数据结构。
- 新增 ai-service 调用 learning-service 的内部 client。
- 迁移 `RoomMessage`、`ActivityLog`、`MessageRepository`、`ActivityLogRepository`。
- 迁移 `CollaborationService`、`ActivityService`、`SyncHub`。
- 新增 collaboration-service `POST /internal/events`。
- learning-service 对关键写操作发布内部事件。
- Gateway 代理 AI、协作、活动日志、SSE。
- 增加 v3 服务测试、Gateway 集成测试、Mock AI 测试和 SSE 测试。

## 不做什么

- 不迁移 assessment-service 业务。
- 不迁移 analytics-service 业务。
- 不实现 AI 批改作业。
- 不实现 AI 出题入库。
- 不把知识库扩大为纯生成水分代码。
- 不把 SSE 事件源放在 Gateway。
- 不做 WebSocket。
- 不做分布式事务。

## 兼容要求

前端仍调用原路径：

- `/api/ai/ask`
- `/api/ai/plan`
- `/api/ai/summarize`
- `/api/collaboration/messages`
- `/api/activity`
- `/api/events`

旧单体仍保留这些接口。v3 微服务模式由 Gateway 接管同名路径。

## 风险控制

- 普通测试必须默认使用 Mock AI。
- LM Studio 失败不能影响普通测试。
- learning-service 发布事件失败不能回滚主业务写操作。
- collaboration-service SSE 断开不能影响消息和活动日志写入。
- ai-service 不能直接读取 `data/learning.json`。
- Gateway 不能直接读取 `data/ai.json` 或 `data/collaboration.json`。

