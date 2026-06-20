# v8 测试计划

## 命令

```bash
npm test
npm run test:services
```

可选手工启动：

```bash
npm run start:services:mock
```

## 自动化测试范围

### 前端测试

- student 默认路由：student 用户无 hash 时为 `student-ai`。
- student 默认路由：student 用户 hash 为旧 `dashboard` 时为 `student-ai`，除非用户显式选择旧 dashboard 的规则另有说明。
- student views 对危险文本进行转义。
- ApiClient 新增 6 个 student AI 方法 path 正确。
- StudentAiAdapter 调用正式 `/api/student-ai/*`。
- StudentAiAdapter 正式 API 失败后 fallback。

### ai-service 测试

- `/api/student-ai/daily-plan` 返回 `type=daily_plan`。
- `/api/student-ai/weakness-insight` 返回 `weaknesses`。
- `/api/student-ai/task-drafts` 返回 `draft`。
- `/api/student-ai/assignment-guide` 返回 `outline` 和 `checklist`。
- `/api/student-ai/submission-check` 返回 `completionEstimate` 和 `issues`。
- `/api/student-ai/note-organize` 返回 `cards` 和 `assignmentParagraphs`。
- mock provider 下所有接口不依赖外网。
- provider 返回非 JSON 时使用 fallback。

### Gateway 测试

- Gateway 代理 6 个 `/api/student-ai/*`。
- 未登录请求被拒绝。
- 登录学生请求成功。
- teacher/admin 请求可以成功，或按业务策略返回同样结构；本阶段不做复杂角色限制。

## 手工验证

- 学生登录后进入 AI 学习台。
- 点击“生成今日建议”返回正式接口结果。
- AI 分析结果页返回正式接口结果。
- 作业详情页“刷新 AI 拆解”返回正式接口结果。
- 提交页“AI 自检”返回正式接口结果。
- 笔记编辑页“AI 整理”返回正式接口结果。
- 断开 ai-service 或模拟失败时前端 fallback 仍可显示结构化结果。

