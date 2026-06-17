# v5 验收清单

## 文档

- [ ] README、scope、architecture-delta、api-delta、data-delta、tasks、test-plan、acceptance、implementation-prompt 均存在。
- [ ] 文档和实现范围一致。
- [ ] 新增 API 均在 api-delta 中说明。
- [ ] 数据所有权清晰，无跨服务读文件。

## analytics-service

- [ ] `/health` 正常。
- [ ] `/api/analytics/overview` 正常。
- [ ] `/api/analytics/courses/:id` 正常。
- [ ] `/api/analytics/students/:id` 正常。
- [ ] `/api/analytics/teacher` 正常。
- [ ] 学生不能访问教师统计。
- [ ] 学生不能访问其他学生画像。
- [ ] 下游不可用时错误清晰。

## Gateway

- [ ] Gateway 配置包含 analytics-service。
- [ ] Gateway 代理所有 analytics API。
- [ ] Gateway `/api/dashboard` 包含 analytics 摘要。
- [ ] Gateway 静态托管 `client/` 正常。
- [ ] v1-v4 API 未退化。

## 前端

- [ ] 登录流程正常。
- [ ] 总览展示 learning、assessment、analytics 指标。
- [ ] 学习视图目标、任务、笔记可用。
- [ ] AI 视图可问答和生成计划。
- [ ] 协作视图消息和 SSE 可用。
- [ ] 评测视图作业、提交、练习、错题可用。
- [ ] 教师统计视图可用。
- [ ] 学生不会看到教师专属操作。
- [ ] 移动端和桌面端布局无明显重叠。

## 测试

- [ ] `npm run test:services` 通过。
- [ ] `npm test` 通过。
- [ ] 测试使用临时数据文件，不污染真实 `data/`。
- [ ] 普通测试不依赖 LM Studio。

## 已知限制

- [ ] 未实现复杂图表库。
- [ ] 未实现统计缓存持久化。
- [ ] 未实现报表导出。
- [ ] 未实现真实班级成员权限模型。

