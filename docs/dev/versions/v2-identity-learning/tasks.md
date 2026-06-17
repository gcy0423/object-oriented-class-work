# v2 任务清单

## 1. identity-service

- [ ] 新增 `services/identity-service/src/domain/identity.js`。
- [ ] 新增 `services/identity-service/src/application/authService.js`。
- [ ] 新增 `services/identity-service/src/infrastructure/seed.js`。
- [ ] 在 config 中加入 `dataFile`、`tokenSecret`。
- [ ] 在 main 中初始化 `JsonDatabase` 和 repository。
- [ ] 实现 `POST /api/auth/login`。
- [ ] 实现 `GET /api/me`。
- [ ] 实现 `POST /internal/auth/verify`。
- [ ] 实现 `GET /internal/users/:id`。
- [ ] 实现 `POST /internal/users/batch`。
- [ ] 实现 `GET /internal/users`。

## 2. learning-service

- [ ] 新增 `services/learning-service/src/domain/learning.js`。
- [ ] 新增 `services/learning-service/src/application/learningService.js`。
- [ ] 新增 `services/learning-service/src/infrastructure/seed.js`。
- [ ] 在 config 中加入 `dataFile`。
- [ ] 在 main 中初始化 `JsonDatabase` 和 repository。
- [ ] 实现 `GET /api/courses`。
- [ ] 实现 `GET /api/dashboard/learning`。
- [ ] 实现 `POST /api/goals`。
- [ ] 实现 `POST /api/tasks`。
- [ ] 实现 `PATCH /api/tasks/:id/complete`。
- [ ] 实现 `POST /api/notes`。
- [ ] 实现 `GET /internal/learning/context/:userId`。

## 3. Gateway

- [ ] 新增 identity-service client。
- [ ] 新增 learning-service client。
- [ ] 新增 Bearer Token 解析。
- [ ] 新增 `verifyUser()` helper。
- [ ] 转发请求时注入用户上下文头。
- [ ] 代理 `/api/auth/login`。
- [ ] 代理 `/api/me`。
- [ ] 代理 `/api/courses`。
- [ ] 代理 `/api/goals`。
- [ ] 代理 `/api/tasks`。
- [ ] 代理 `/api/tasks/:id/complete`。
- [ ] 代理 `/api/notes`。
- [ ] 聚合 `/api/dashboard`。

## 4. 数据

- [ ] 新增 `data/identity.json` seed 逻辑。
- [ ] 新增 `data/learning.json` seed 逻辑。
- [ ] 确认 Gateway 不直接读取 JSON 文件。
- [ ] 确认旧 `data/app-data.json` 不被修改。

## 5. 测试

- [ ] identity-service 登录测试。
- [ ] identity-service Token 校验测试。
- [ ] learning-service 创建目标测试。
- [ ] learning-service 创建任务并重算进度测试。
- [ ] learning-service 完成任务测试。
- [ ] learning-service 创建笔记测试。
- [ ] Gateway 登录代理测试。
- [ ] Gateway 学习接口代理测试。
- [ ] Gateway dashboard 聚合测试。
- [ ] 旧 `npm test` 回归测试。

## 6. 文档同步

- [ ] 如果接口实现和本版本文档不同，先改文档。
- [ ] v2 完成后勾选 `acceptance.md`。

