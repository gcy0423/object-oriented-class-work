# v5 任务清单

## 1. analytics-service 领域与应用

- [ ] 新增 `domain/analytics.js`。
- [ ] 新增 `application/analyticsService.js`。
- [ ] 实现 overview 聚合。
- [ ] 实现 course analytics 聚合。
- [ ] 实现 student analytics 聚合。
- [ ] 实现 teacher analytics 聚合。
- [ ] 实现风险学生和建议生成的确定性规则。

## 2. analytics-service 下游 client

- [ ] 新增 identity client。
- [ ] 新增 learning client。
- [ ] 新增 assessment client。
- [ ] 新增 collaboration client。
- [ ] 新增 ai client。
- [ ] config 加入下游服务 URL 和 timeout。
- [ ] 所有 client 使用 `x-edumind-internal-key`。

## 3. analytics-service HTTP API

- [ ] 实现 `GET /api/analytics/overview`。
- [ ] 实现 `GET /api/analytics/courses/:id`。
- [ ] 实现 `GET /api/analytics/students/:id`。
- [ ] 实现 `GET /api/analytics/teacher`。
- [ ] 保留 `GET /health`。
- [ ] 学生、教师、管理员权限检查覆盖到位。

## 4. 下游内部接口补强

- [ ] 确认 learning-service 内部 context 满足统计需要。
- [ ] 确认 assessment-service 内部 context/dashboard 满足统计需要。
- [ ] 如需新增内部只读接口，写入 api-delta 并补测试。
- [ ] 不允许跨服务直接读取 JSON 数据文件。

## 5. Gateway

- [ ] 新增 analytics-service client。
- [ ] 代理 `/api/analytics/overview`。
- [ ] 代理 `/api/analytics/courses/:id`。
- [ ] 代理 `/api/analytics/students/:id`。
- [ ] 代理 `/api/analytics/teacher`。
- [ ] `/api/dashboard` 聚合 analytics overview。
- [ ] `/api/health` 继续包含 analytics-service 状态。

## 6. 前端 API 层

- [ ] `client/src/api.js` 新增 assessment 方法。
- [ ] `client/src/api.js` 新增 analytics 方法。
- [ ] 所有请求继续走相对路径 `/api/*`。
- [ ] 错误处理保持统一。

## 7. 前端视图

- [ ] 导航新增 `评测`。
- [ ] 导航新增 `统计`，教师可见。
- [ ] 总览展示 analytics 摘要。
- [ ] 评测视图展示作业列表和提交入口。
- [ ] 评测视图支持开始练习、提交答案、完成练习。
- [ ] 错题区域支持查看和标记复习。
- [ ] 教师统计视图展示课程统计、学生概览、作业完成情况。
- [ ] 保持移动端和桌面端布局可用。

## 8. 样式与交互

- [ ] 补齐表格、统计条、标签、状态徽标样式。
- [ ] 补齐 loading、empty、error 状态。
- [ ] 表单提交后刷新相关数据。
- [ ] SSE 协作消息不影响 analytics 请求。

## 9. 测试

- [ ] analytics-service overview 测试。
- [ ] analytics-service course analytics 测试。
- [ ] analytics-service student analytics 测试。
- [ ] analytics-service teacher analytics 权限测试。
- [ ] Gateway analytics 代理测试。
- [ ] Gateway dashboard analytics 聚合测试。
- [ ] 前端依赖的数据形状测试。
- [ ] v1-v4 测试仍通过。

