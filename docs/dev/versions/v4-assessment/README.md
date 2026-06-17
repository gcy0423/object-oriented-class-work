# v4-assessment

v4 在 v3 已具备 identity、learning、ai、collaboration 能力的基础上，新增 assessment-service 真实业务。完成后，作业发布、作业提交、Rubric 评分、教师评分、AI 初评、题库、练习、错题本应由 assessment-service 统一负责，Gateway 对外保持 `/api/*` 路径兼容。

## 版本目标

- assessment-service 接管作业、提交、Rubric、评分、题库、练习、错题本。
- Gateway 代理 assessment 相关 API。
- assessment-service 通过 learning-service 校验课程和学习上下文。
- assessment-service 通过 identity-service 获取用户快照。
- assessment-service 调用 ai-service 完成作业 AI 初评。
- assessment-service 调用 collaboration-service 发布作业、提交、评分、练习事件。
- Dashboard 聚合作业和练习摘要。
- 普通测试继续使用 Mock AI，不依赖 LM Studio。

## 本版本不做

- 不新增 analytics-service 真实统计服务。
- 不做完整教师统计看板。
- 不做文件上传存储，只保存附件元数据。
- 不做复杂班级权限，v4 先以登录角色和 courseId 为主。
- 不做 AI 自动出题入库，最多预留接口。
- 不引入数据库、消息队列、Docker、注册中心。
- 不删除旧单体代码。

## 目标启动命令

```bash
npm run start:services:mock
npm run test:services
npm test
```

可选真实模型测试：

```bash
npm run test:lmstudio
```

## 版本完成标准

- Gateway `/api/assignments` 可查询和创建作业。
- Gateway `/api/assignments/:id/submissions` 可提交作业。
- Gateway `/api/submissions/:id/grade` 可评分。
- Gateway `/api/submissions/:id/ai-review` 可触发 AI 初评。
- Gateway 题库、练习、错题相关接口可用。
- assessment-service 使用 `data/assessment.json`。
- assessment-service 写操作能发布 collaboration 事件。
- Dashboard 包含 assignments、practice、assessment 相关 metrics。

