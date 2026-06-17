# v2 实现提示词

下面的提示词用于启动 v2-identity-learning 阶段开发。

```text
请开始实现 docs/dev/versions/v2-identity-learning/ 定义的 v2 阶段。

开发前必须阅读并遵守：
- docs/dev/architecture.md
- docs/dev/service-boundaries.md
- docs/dev/api-contracts.md
- docs/dev/migration-plan.md
- docs/dev/versions/v2-identity-learning/README.md
- docs/dev/versions/v2-identity-learning/scope.md
- docs/dev/versions/v2-identity-learning/architecture-delta.md
- docs/dev/versions/v2-identity-learning/api-delta.md
- docs/dev/versions/v2-identity-learning/data-delta.md
- docs/dev/versions/v2-identity-learning/tasks.md
- docs/dev/versions/v2-identity-learning/test-plan.md
- docs/dev/versions/v2-identity-learning/acceptance.md

本阶段目标：
1. 将 identity-service 从 health 骨架扩展为真实用户与认证服务。
2. 将 learning-service 从 health 骨架扩展为真实课程、目标、任务、笔记服务。
3. Gateway 接管登录、当前用户、课程、目标、任务、笔记和 dashboard 的外部 /api 路径。
4. 拆出 data/identity.json 和 data/learning.json，旧 data/app-data.json 保留给单体。
5. 保持旧前端 API 路径不变。
6. 保持 npm start 和 npm test 不被破坏。

本阶段明确不做：
1. 不迁移 AI 服务。
2. 不迁移协作消息、活动日志、SSE。
3. 不新增作业、题库、评分、统计。
4. 不引入数据库、Docker、消息队列、注册中心。
5. 不删除旧 server/src 单体代码。

实现要求：
1. identity-service 迁移 User、Roles、UserRepository、AuthService。
2. identity-service 实现 POST /api/auth/login、GET /api/me、POST /internal/auth/verify、GET /internal/users/:id、POST /internal/users/batch、GET /internal/users。
3. learning-service 迁移 Course、LearningGoal、StudyTask、LearningNote 及相关 Repository 和 LearningService。
4. learning-service 实现 GET /api/courses、GET /api/dashboard/learning、POST /api/goals、POST /api/tasks、PATCH /api/tasks/:id/complete、POST /api/notes、GET /internal/learning/context/:userId。
5. Gateway 实现 Token 校验、用户上下文注入、identity/learning 代理和 /api/dashboard 聚合。
6. 服务之间只通过 HTTP client 通信，Gateway 不能直接读写 data/identity.json 或 data/learning.json。
7. 测试使用临时 JSON 数据文件，不污染真实 data 目录。

测试要求：
1. 运行 npm test，确认旧单体回归不破坏。
2. 运行 npm run test:services，确认 v1 health 测试和 v2 identity/learning/Gateway 测试通过。
3. 如当前环境没有 Node/npm，需要说明无法运行测试，并保留明确的本机测试命令。

完成后请按 docs/dev/versions/v2-identity-learning/acceptance.md 给出验收结果。
```

短指令：

```text
实现 v2-identity-learning：迁移 identity-service 和 learning-service，Gateway 保持原 /api 路径兼容；不迁移 AI/协作/作业统计；按 v2 acceptance.md 验收。
```

