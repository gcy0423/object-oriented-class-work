# v5 实现提示词

下面的提示词用于启动 v5-analytics-frontend 阶段开发。

```text
请开始实现 docs/dev/versions/v5-analytics-frontend/ 定义的 v5 阶段。

开发前必须阅读并遵守：
- docs/dev/architecture.md
- docs/dev/service-boundaries.md
- docs/dev/api-contracts.md
- docs/dev/migration-plan.md
- docs/dev/versions/v5-analytics-frontend/README.md
- docs/dev/versions/v5-analytics-frontend/scope.md
- docs/dev/versions/v5-analytics-frontend/architecture-delta.md
- docs/dev/versions/v5-analytics-frontend/api-delta.md
- docs/dev/versions/v5-analytics-frontend/data-delta.md
- docs/dev/versions/v5-analytics-frontend/tasks.md
- docs/dev/versions/v5-analytics-frontend/test-plan.md
- docs/dev/versions/v5-analytics-frontend/acceptance.md

本阶段目标：
1. 将 analytics-service 从 health 骨架扩展为真实只读统计服务。
2. analytics-service 通过 identity、learning、assessment、collaboration、ai 的 API 聚合数据，不能直接读取其他服务 JSON 文件。
3. Gateway 代理 /api/analytics/*，并在 /api/dashboard 中合并 analytics 摘要。
4. client/ 前端补齐 assessment 和 analytics 接入，形成学生和教师都能使用的完整工作台。
5. 保持前端无构建依赖，继续使用原生 HTML、CSS、ESM。
6. 保持 v1-v4 API 和测试不退化。

本阶段明确不做：
1. 不引入 React、Vue、Vite、Webpack 或其他前端构建链。
2. 不引入数据库、Docker、消息队列、注册中心。
3. 不做复杂图表库，只使用数字卡片、表格、CSS 条形等轻量表达。
4. 不做文件上传、题目导入导出、作业互评。
5. 不删除旧 server/src 单体代码。
6. 普通测试不依赖 LM Studio。

实现要求：
1. analytics-service 新增 domain/application/infrastructure client 分层。
2. 实现 GET /api/analytics/overview、GET /api/analytics/courses/:id、GET /api/analytics/students/:id、GET /api/analytics/teacher。
3. analytics-service 权限必须区分 student、teacher、admin。
4. Gateway 新增 analytics client，代理 analytics API。
5. Gateway /api/dashboard 在保留 v4 字段基础上新增 analytics 和 meta.analyticsStatus。
6. client/src/api.js 新增 assessment 与 analytics 方法。
7. client/src/app.js 新增评测视图和教师统计视图。
8. client/styles.css 补齐统计、表格、状态、响应式样式。
9. 所有前端请求必须走 Gateway 相对路径 /api/*。

测试要求：
1. 运行 npm run test:services，确认 v1-v5 服务测试通过。
2. 运行 npm test，确认旧单体回归不破坏。
3. 服务测试使用临时 JSON 数据文件，不污染真实 data 目录。
4. 如当前环境没有 Node/npm，需要说明无法运行测试，并保留明确的本机测试命令。

完成后请按 docs/dev/versions/v5-analytics-frontend/acceptance.md 给出验收结果。
```

短指令：

```text
实现 v5-analytics-frontend：把 analytics-service 做成只读统计聚合服务，Gateway 代理 /api/analytics/* 并聚合 dashboard；扩展 client/ 前端接入 assessment 和 analytics，形成学生/教师完整工作台；保持无构建依赖并通过 v1-v5 测试。
```

