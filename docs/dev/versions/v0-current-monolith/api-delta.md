# v0 API 基线

v0 当前接口全部由 `server/src/application/controllers.js` 注册。

## 当前接口

| 方法 | 路径 | 当前处理 |
| --- | --- | --- |
| GET | `/api/health` | 返回单体服务状态 |
| POST | `/api/auth/login` | `AuthService.login` |
| GET | `/api/me` | Token 校验后返回当前用户 |
| GET | `/api/dashboard` | `LearningService.dashboardFor` + users |
| GET | `/api/courses` | 直接返回课程 repository |
| POST | `/api/goals` | `LearningService.createGoal` |
| POST | `/api/tasks` | `LearningService.createTask` |
| PATCH | `/api/tasks/:id/complete` | `LearningService.completeTask` |
| POST | `/api/notes` | `LearningService.createNote` |
| POST | `/api/ai/ask` | `AITutorService.ask` |
| POST | `/api/ai/plan` | `AITutorService.generatePlan` |
| POST | `/api/ai/summarize` | `AITutorService.summarizeNote` |
| GET | `/api/collaboration/messages` | `CollaborationService.roomMessages` |
| POST | `/api/collaboration/messages` | `CollaborationService.sendMessage` |
| GET | `/api/activity` | activityLogs latest |
| GET | `/api/events` | `SyncHub.handleSse` |

## 当前响应格式

成功：

```json
{ "ok": true, "data": {} }
```

失败：

```json
{
  "ok": false,
  "code": "AUTH_REQUIRED",
  "message": "登录状态无效，请重新登录。"
}
```

## 迁移说明

v1 不迁移业务接口，只准备 Gateway 和健康检查。业务接口从 v2 开始逐步迁移。

