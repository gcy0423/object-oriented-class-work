# v6 实现提示词

下面的提示词用于启动 v6-frontend-workbench 阶段开发。

```text
请开始实现 docs/dev/versions/v6-frontend-workbench/ 定义的 v6 阶段。

开发前必须阅读并遵守：
- docs/dev/architecture.md
- docs/dev/service-boundaries.md
- docs/dev/api-contracts.md
- docs/dev/migration-plan.md
- docs/dev/versions/v6-frontend-workbench/README.md
- docs/dev/versions/v6-frontend-workbench/scope.md
- docs/dev/versions/v6-frontend-workbench/architecture-delta.md
- docs/dev/versions/v6-frontend-workbench/api-delta.md
- docs/dev/versions/v6-frontend-workbench/data-delta.md
- docs/dev/versions/v6-frontend-workbench/tasks.md
- docs/dev/versions/v6-frontend-workbench/test-plan.md
- docs/dev/versions/v6-frontend-workbench/acceptance.md
- docs/dev/versions/v6-frontend-workbench/code-blueprint.md

本阶段目标：
1. 扩展前端工作台为完整教师/学生评测工作台。
2. 新增作业管理完整页：教师发布、编辑、筛选、评分、AI 初评结果查看。
3. 新增题库管理页：题库 CRUD、题目 CRUD、题型表单、答案解析。
4. 新增练习页：答题卡、进度、错题回放、练习历史。
5. 扩展统计页：课程统计、学生画像、作业完成率、掌握度条形图。
6. 新增设置页：模型配置说明、服务健康面板、用户资料。
7. 将前端拆分为 views/、forms/、widgets/、state/、utils/。
8. 保持无构建依赖，继续使用原生 HTML、CSS、ESM。

本阶段明确不做：
1. 不引入 React、Vue、Vite、Webpack、Tailwind 编译链或 TypeScript。
2. 不引入复杂图表库。
3. 不做文件导入导出、富文本编辑器、真实模型密钥保存。
4. 不删除旧 server/src 单体代码。
5. 普通测试不依赖 LM Studio。

实现顺序：
1. 先建立 client/src/state、utils、widgets、forms、views 目录。
2. 抽出 escapeHtml、formatDate、statusBadge、emptyState、metric 等基础工具和部件。
3. 将 Store 迁移到 state/viewState.js，并保持旧导入兼容。
4. 将 app.js 改成路由和事件编排层。
5. 拆出现有 dashboard、learning、ai、team、analytics 页面。
6. 实现 assignments 作业管理页。
7. 实现 question-banks 题库管理页。
8. 实现 practice 练习页。
9. 实现 settings 设置页。
10. 补 API 方法；如果后端缺 CRUD API，同步补 assessment-service 和 Gateway。
11. 补 styles.css 新页面样式和响应式。
12. 补测试并运行 npm run test:services 与 npm test。

UI 要求：
1. 使用数据密集型 Dashboard 风格，不做营销页。
2. 页面以筛选器、表格、详情面板、表单、条形图、状态徽标为核心。
3. 表单必须有 label、helper text、字段级错误。
4. 所有写操作必须有 saving 状态，按钮禁用重复提交。
5. 图表必须显示文本值，不能只依赖颜色。
6. 移动端不能出现横向溢出；宽表格使用 table-wrap 或卡片化。
7. focus ring 必须可见。

完成后请按 docs/dev/versions/v6-frontend-workbench/acceptance.md 给出验收结果。
```

短指令：

```text
实现 v6-frontend-workbench：在不引入前端框架和构建链的前提下，把 client/ 拆成 views/forms/widgets/state/utils，新增作业管理、题库管理、练习、统计增强、设置页，并补齐必要 CRUD API、样式和测试。
```

