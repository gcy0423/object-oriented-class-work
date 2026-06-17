# v0 数据基线

当前所有业务数据保存在一个 JSON 文件：

```text
data/app-data.json
```

## 当前集合

| collection | 所属概念 | 目标服务 |
| --- | --- | --- |
| `users` | 用户、角色、邮箱、头像 | identity-service |
| `courses` | 课程 | learning-service |
| `goals` | 学习目标 | learning-service |
| `tasks` | 学习任务 | learning-service |
| `notes` | 学习笔记 | learning-service |
| `messages` | 协作消息 | collaboration-service |
| `activityLogs` | 活动日志 | collaboration-service |

## 本地知识库

当前 `server/src/domain/learningResourceCatalog.js` 是手写的本地课程知识库入口。它只保留可审查的课程资源、标签和检索逻辑；后续扩展应迁入 ai-service 的 knowledge infrastructure，并避免使用生成文件充当代码量。

## v0 不做数据迁移

v0 只记录当前状态。真正的数据拆分从 v2 开始。

