# v4 测试计划

## 普通回归测试

```bash
npm test
```

目的：确认旧单体未被破坏。

## 服务测试

```bash
npm run test:services
```

v4 在 v1-v3 测试基础上新增 assessment 测试。

## assessment-service 测试

覆盖：

- 教师发布作业。
- 学生不能发布作业。
- 学生提交作业。
- 学生不能替别人提交。
- 教师查看作业详情和 submissions。
- 教师评分。
- 学生不能评分。
- AI 初评成功保存为 AI feedback。
- AI 初评失败不破坏 submission。
- 写操作发布 collaboration 事件。

## 题库和练习测试

覆盖：

- 教师创建题库。
- 教师创建单选题、多选题、判断题、简答题。
- 学生开始练习。
- 提交答案。
- 客观题自动判分。
- 错题自动生成。
- 完成练习后计算得分和正确率。
- 错题复习后状态更新。
- 掌握度记录更新。

## Gateway 集成测试

覆盖：

- Gateway `/api/assignments` GET/POST。
- Gateway `/api/assignments/:id/submissions`。
- Gateway `/api/submissions/:id/grade`。
- Gateway `/api/submissions/:id/ai-review`。
- Gateway `/api/question-banks`。
- Gateway `/api/questions`。
- Gateway `/api/practice-sessions`。
- Gateway `/api/mistakes`。
- Gateway `/api/dashboard` 包含 assignments/practice/metrics。
- 未登录访问 assessment API 返回 401。

## 手动验证

1. 启动服务：

```bat
start-services-local.cmd
```

2. 打开：

```text
http://127.0.0.1:4077
```

3. 验证：

- 教师可发布作业。
- 学生可提交作业。
- 教师可评分。
- 教师可触发 AI 初评。
- 学生可进入题库练习。
- 答错题后进入错题本。
- 总览页显示作业和练习摘要。
- 协作区能看到作业/提交/评分相关活动。

## 测试数据隔离

测试应使用临时 JSON 文件，不污染：

- `data/assessment.json`
- `data/ai.json`
- `data/collaboration.json`
- `data/identity.json`
- `data/learning.json`

