# v8 实现提示词

下面的提示词用于启动 `v8-student-ai-first-phase2-ai-workflow` 阶段开发。

```text
请开始实现 docs/dev/versions/v8-student-ai-first-phase2-ai-workflow/ 定义的 v8 阶段。

开发前必须阅读并遵守：
- docs/dev/architecture.md
- docs/dev/service-boundaries.md
- docs/dev/api-contracts.md
- docs/dev/migration-plan.md
- docs/dev/versions/v7-student-ai-first-phase1/README.md
- docs/dev/versions/v7-student-ai-first-phase1/acceptance.md
- docs/dev/versions/v8-student-ai-first-phase2-ai-workflow/README.md
- docs/dev/versions/v8-student-ai-first-phase2-ai-workflow/scope.md
- docs/dev/versions/v8-student-ai-first-phase2-ai-workflow/architecture-delta.md
- docs/dev/versions/v8-student-ai-first-phase2-ai-workflow/api-delta.md
- docs/dev/versions/v8-student-ai-first-phase2-ai-workflow/data-delta.md
- docs/dev/versions/v8-student-ai-first-phase2-ai-workflow/tasks.md
- docs/dev/versions/v8-student-ai-first-phase2-ai-workflow/test-plan.md
- docs/dev/versions/v8-student-ai-first-phase2-ai-workflow/acceptance.md
- docs/dev/versions/v8-student-ai-first-phase2-ai-workflow/code-blueprint.md

本阶段目标：
1. 修复 v7 遗留：学生带 token 启动默认进入 student-ai。
2. 修复 v7 遗留：student views 中 AI、后端、用户文本统一转义。
3. 在 ai-service 中新增 StudentAiWorkflowService。
4. 新增 /api/student-ai/daily-plan、weakness-insight、task-drafts、assignment-guide、submission-check、note-organize。
5. Gateway 代理上述接口。
6. 前端 ApiClient 增加 6 个 student AI 方法。
7. StudentAiAdapter 优先调用正式 API，失败时 fallback。
8. 保持无前端构建链。
9. 普通测试不依赖 LM Studio、外网或真实 LangChain。

实现顺序：
1. 先修默认路由和 student views 转义。
2. 补对应前端测试。
3. 实现 ai-service student AI schema、prompt、fallback、workflow service。
4. 增加 ai-service routes。
5. 增加 Gateway 代理。
6. 更新 ApiClient。
7. 更新 StudentAiAdapter。
8. 补 services test 和 client test。
9. 运行 npm test 与 npm run test:services。

完成后请按 docs/dev/versions/v8-student-ai-first-phase2-ai-workflow/acceptance.md 给出验收结果。
```

短指令：

```text
实现 v8-student-ai-first-phase2-ai-workflow：修复 v7 学生端默认路由和转义问题；在 ai-service/Gateway 新增 /api/student-ai/* 六个结构化 AI 工作流；前端 StudentAiAdapter 切换正式 API 并保留 fallback；补测试。
```

