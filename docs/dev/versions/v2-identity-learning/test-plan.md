# v2 测试计划

## 普通回归测试

```bash
npm test
```

目的：确认旧单体没有被破坏。

## 服务测试

```bash
npm run test:services
```

v2 在原 v1 服务测试基础上新增 identity 和 learning 业务测试。

## identity-service 测试

覆盖：

- 登录已有学生。
- 登录已有教师。
- 新邮箱自动创建用户。
- 非法 role 自动降级为 `student`。
- Token 可被 `/internal/auth/verify` 校验。
- 错误 Token 返回 `AUTH_REQUIRED`。
- `/internal/users/:id` 返回用户。
- `/internal/users/batch` 返回用户数组。

## learning-service 测试

覆盖：

- `GET /api/courses` 返回 seed 课程。
- `GET /api/dashboard/learning` 返回当前用户目标、任务、笔记和 metrics。
- `POST /api/goals` 创建目标。
- 不存在 courseId 创建目标返回 `NOT_FOUND`。
- `POST /api/tasks` 创建任务并重算 goal progress。
- 学生不能给别人的 goal 创建 task。
- `PATCH /api/tasks/:id/complete` 完成任务并重算 progress。
- `POST /api/notes` 创建笔记。
- `/internal/learning/context/:userId` 返回 AI 可用上下文。

## Gateway 集成测试

覆盖：

- Gateway `/api/auth/login` 能登录并返回 Token。
- Gateway `/api/me` 能返回当前用户。
- Gateway 无 Token 访问学习接口返回 401。
- Gateway `/api/courses` 能代理到 learning-service。
- Gateway `/api/goals` 能代理创建目标。
- Gateway `/api/tasks` 能代理创建任务。
- Gateway `/api/tasks/:id/complete` 能代理完成任务。
- Gateway `/api/notes` 能代理创建笔记。
- Gateway `/api/dashboard` 能聚合 learning 数据和 users。

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

- 可以登录。
- 学习总览能显示课程、目标、任务、笔记。
- 可以新增目标。
- 可以新增任务。
- 可以完成任务。
- 可以新增笔记。
- AI 页面和协作页面如果未迁移，应明确不可用或仍由旧单体模式演示。

## 测试数据隔离

测试应使用临时 JSON 文件，不污染 `data/identity.json` 和 `data/learning.json`。

