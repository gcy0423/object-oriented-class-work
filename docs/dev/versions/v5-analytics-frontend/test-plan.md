# v5 测试计划

## 命令

```bash
npm run test:services
npm test
```

可选：

```bash
npm run start:services:mock
```

然后访问：

```text
http://127.0.0.1:4077/
```

## analytics-service 测试

- health 返回 `service=analytics-service`。
- overview 对学生返回个人学习、评测、协作、AI 摘要。
- overview 对教师返回课程级汇总。
- course analytics 返回课程作业、练习、掌握度、活动统计。
- student analytics 允许本人读取。
- student analytics 允许教师读取。
- student analytics 拒绝其他学生读取。
- teacher analytics 拒绝学生读取。
- 下游服务不可用时返回明确错误。

## Gateway 测试

- `/api/health` 包含 analytics-service。
- `/api/analytics/overview` 代理成功。
- `/api/analytics/courses/:id` 代理成功。
- `/api/analytics/students/:id` 代理成功。
- `/api/analytics/teacher` 代理成功。
- `/api/dashboard` 包含 `analytics` 和 `meta.analyticsStatus`。
- analytics-service 不可用时，dashboard 降级行为符合文档。

## 前端手工验证

- 学生登录后可查看总览、学习、AI、协作。
- 学生可查看作业并提交。
- 学生可开始练习、提交答案、完成练习。
- 学生可查看错题并标记复习。
- 教师登录后可发布作业或查看作业管理入口。
- 教师可查看统计视图。
- 网络错误时显示提示，不白屏。
- 窄屏下导航、卡片、表单不重叠。

## 回归测试

- v1 service skeleton 测试仍通过。
- v2 identity/learning 测试仍通过。
- v3 ai/collaboration 测试仍通过。
- v4 assessment 测试仍通过。
- `npm test` 的旧单体核心测试仍通过。

