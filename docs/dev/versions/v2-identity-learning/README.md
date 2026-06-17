# v2-identity-learning

v2 在 v1 微服务骨架基础上迁移 identity-service 和 learning-service。完成后，登录、当前用户、课程、学习目标、任务、笔记应由独立服务处理，Gateway 对外保持原 `/api/*` 路径兼容。

## 版本目标

- identity-service 接管登录、Token 签发、Token 校验、用户查询。
- learning-service 接管课程、目标、任务、笔记和学习 Dashboard 基础数据。
- Gateway 为业务接口提供转发和用户上下文注入。
- 将 `users` 拆到 `data/identity.json`。
- 将 `courses`、`goals`、`tasks`、`notes` 拆到 `data/learning.json`。
- 保持旧前端无需改 API 路径即可完成登录和学习页面操作。
- 保留当前单体 `npm start` 作为迁移期兜底。

## 本版本不做

- 不迁移 AI 业务。
- 不迁移协作消息、活动日志、SSE。
- 不新增作业、题库、评分、统计。
- 不改变前端路由结构。
- 不引入数据库、消息队列、Docker。
- 不删除旧单体代码。

## 目标启动命令

```bash
npm run start:services:mock
npm run test:services
npm test
```

Windows 本地脚本：

```bat
start-services-local.cmd
test-services-local.cmd
test-local.cmd
```

## 版本完成标准

- Gateway `/api/auth/login` 转发到 identity-service。
- Gateway `/api/me` 转发到 identity-service。
- Gateway 能校验 Token 并给 learning-service 注入用户上下文。
- Gateway `/api/courses`、`/api/goals`、`/api/tasks`、`/api/notes` 转发到 learning-service。
- Gateway `/api/dashboard` 能聚合 learning-service 学习数据和 identity-service 用户列表。
- identity-service、learning-service 使用独立 JSON 数据文件。
- 现有学习流程测试能在微服务模式下通过。

