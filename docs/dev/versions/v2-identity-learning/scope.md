# v2 范围

## 做什么

- 迁移 `User`、`Roles`、`UserRepository`。
- 迁移 `AuthService` 的登录、签发 Token、校验 Token。
- 新增 identity-service 内部用户查询接口。
- 迁移 `Course`、`LearningGoal`、`StudyTask`、`LearningNote`。
- 迁移课程、目标、任务、笔记 repository。
- 迁移 `LearningService` 中与目标、任务、笔记和 Dashboard 相关的逻辑。
- Gateway 增加业务代理和鉴权中间逻辑。
- 增加 `data/identity.json`、`data/learning.json` seed。
- 增加 v2 服务测试和 Gateway 集成测试。

## 不做什么

- 不迁移 `AITutorService`。
- 不迁移 `ActivityService`、`CollaborationService`、`SyncHub`。
- 不把 task/goal 事件接入 collaboration-service。
- 不做 AI 答疑上下文跨服务调用。
- 不做班级、学习路径扩展。
- 不做作业、题库、统计。
- 不修改 `learningResourceCatalog.js` 的知识库检索逻辑。

## 兼容要求

前端仍调用原路径：

- `/api/auth/login`
- `/api/me`
- `/api/dashboard`
- `/api/courses`
- `/api/goals`
- `/api/tasks`
- `/api/tasks/:id/complete`
- `/api/notes`

旧单体仍保留这些接口。v2 微服务模式由 Gateway 接管同名路径。

## 风险控制

- 不删除 `server/src/application/services.js` 中旧业务代码。
- 不删除 `data/app-data.json`。
- 新服务数据 seed 应从当前 `createSeedData()` 复制语义，而不是移动旧文件。
- 如果 Gateway 聚合失败，应返回明确错误，不吞异常。

