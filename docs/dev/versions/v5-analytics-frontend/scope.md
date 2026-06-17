# v5 范围

## 做什么

- 实现 analytics-service 应用层、领域层和下游服务 client。
- 新增学习进度、作业完成、评分分布、练习正确率、错题数量、掌握度、活动热度统计。
- 新增 analytics 内部聚合逻辑，按用户、课程、角色输出不同视图。
- Gateway 新增 analytics-service client，并代理 `/api/analytics/*`。
- Gateway `/api/dashboard` 合并 analytics 摘要，减少前端重复请求。
- 前端 API 层补齐 assessment 和 analytics 方法。
- 前端新增评测视图：作业列表、作业提交、题库练习、错题复习。
- 前端新增教师视图：课程统计、作业统计、学生概览、近期活动。
- 前端样式补齐响应式布局和空状态、错误状态、加载状态。
- 测试覆盖 analytics-service、Gateway analytics 代理、前端关键 API 所需数据形状。

## 不做什么

- 不做独立前端开发服务器。
- 不做前端单元测试框架。
- 不做图表库集成，统计图形先用 CSS 条形、数字卡片和表格。
- 不做实时统计推送，v5 统计通过请求刷新。
- 不做跨服务缓存失效和复杂报表导出。
- 不做管理员后台配置。
- 不做外部对象存储。

## 兼容要求

v5 不能破坏以下已稳定路径：

- `/api/auth/*`
- `/api/me`
- `/api/dashboard`
- `/api/courses`
- `/api/goals`
- `/api/tasks`
- `/api/notes`
- `/api/ai/*`
- `/api/collaboration/*`
- `/api/activity`
- `/api/events`
- `/api/assignments`
- `/api/submissions/*`
- `/api/rubrics`
- `/api/question-banks`
- `/api/questions`
- `/api/practice-sessions`
- `/api/mistakes`

## 风险控制

- analytics-service 只能调用服务 API，不能直接读取 `data/*.json`。
- analytics-service 下游部分不可用时，应返回明确错误或降级字段，不能让 Gateway 无响应。
- 前端所有写操作必须使用 Gateway `/api/*`，不能直连子服务端口。
- 教师统计接口必须验证角色，学生只能读取自己的统计。
- 普通自动化测试必须使用 Mock AI。

