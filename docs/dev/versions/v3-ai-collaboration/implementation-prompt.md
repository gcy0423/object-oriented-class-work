# v3 实现提示词

下面的提示词用于启动 v3-ai-collaboration 阶段开发。

```text
请开始实现 docs/dev/versions/v3-ai-collaboration/ 定义的 v3 阶段。

开发前必须阅读并遵守：
- docs/dev/architecture.md
- docs/dev/service-boundaries.md
- docs/dev/api-contracts.md
- docs/dev/migration-plan.md
- docs/dev/versions/v3-ai-collaboration/README.md
- docs/dev/versions/v3-ai-collaboration/scope.md
- docs/dev/versions/v3-ai-collaboration/architecture-delta.md
- docs/dev/versions/v3-ai-collaboration/api-delta.md
- docs/dev/versions/v3-ai-collaboration/data-delta.md
- docs/dev/versions/v3-ai-collaboration/tasks.md
- docs/dev/versions/v3-ai-collaboration/test-plan.md
- docs/dev/versions/v3-ai-collaboration/acceptance.md

本阶段目标：
1. 将 ai-service 从 health 骨架扩展为真实 AI 服务。
2. 将 collaboration-service 从 health 骨架扩展为真实协作、活动日志和 SSE 服务。
3. Gateway 接管 /api/ai/*、/api/collaboration/messages、/api/activity、/api/events。
4. learning-service 在目标、任务、笔记写操作后向 collaboration-service 发布内部事件。
5. 新增 data/ai.json 和 data/collaboration.json，旧 data/app-data.json 保留给单体。
6. 普通测试默认使用 Mock AI，不依赖 LM Studio。

本阶段明确不做：
1. 不新增作业、题库、评分、错题本。
2. 不新增 analytics-service 统计能力。
3. 不实现 AI 作业批改。
4. 不实现 AI 自动出题入库。
5. 不引入数据库、Docker、消息队列、注册中心。
6. 不删除旧 server/src 单体代码。

实现要求：
1. ai-service 迁移 PromptTemplate、AIResponse、MockLLMProvider、OpenAICompatibleProvider、LMStudioProvider 和 AITutorService。
2. ai-service 实现 POST /api/ai/ask、POST /api/ai/plan、POST /api/ai/summarize、GET /internal/ai/provider-health。
3. ai-service 通过 learning-service /internal/learning/context/:userId 获取学习上下文，不能直接读取 data/learning.json。
4. 将手写课程知识库检索能力接入 ai-service 的 infrastructure/knowledge，不在 v3 扩大生成资源规模。
5. collaboration-service 迁移 RoomMessage、ActivityLog、CollaborationService、ActivityService、SyncHub。
6. collaboration-service 实现 GET/POST /api/collaboration/messages、GET /api/activity、GET /api/events、POST /internal/events。
7. learning-service 在 createGoal、createTask、completeTask、createNote 后发布内部事件；事件发布失败不能回滚主业务。
8. Gateway 对 AI、协作、活动、SSE 做代理，并增强 /api/dashboard 聚合 activity 和 provider。
9. 服务之间只通过 HTTP client 通信，Gateway 不能直接读写 data/ai.json 或 data/collaboration.json。
10. 测试使用临时 JSON 数据文件，不污染真实 data 目录。

测试要求：
1. 运行 npm test，确认旧单体回归不破坏。
2. 运行 npm run test:services，确认 v1/v2/v3 服务测试通过。
3. npm run test:lmstudio 仅作为独立真实模型测试，不作为普通测试前置条件。
4. 如当前环境没有 Node/npm，需要说明无法运行测试，并保留明确的本机测试命令。

完成后请按 docs/dev/versions/v3-ai-collaboration/acceptance.md 给出验收结果。
```

短指令：

```text
实现 v3-ai-collaboration：迁移 ai-service 和 collaboration-service，Gateway 保持原 /api 路径兼容；learning-service 写操作发布内部事件；不做作业/题库/统计；按 v3 acceptance.md 验收。
```

