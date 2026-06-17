# v0 架构状态

v0 是基线版本，没有相对上个版本的架构变化。

## 实际架构

```text
Browser
  -> Node.js single process :4077
      -> static client files
      -> Router
      -> AppKernel
          -> AuthService
          -> LearningService
          -> AITutorService
          -> CollaborationService
          -> ActivityService
          -> JsonDatabase(data/app-data.json)
```

## 分层说明

| 层 | 当前目录 | 说明 |
| --- | --- | --- |
| framework | `server/src/framework` | HTTP、Router、Response、Error、EventBus/SSE |
| application | `server/src/application` | controller、kernel、service 编排 |
| domain | `server/src/domain` | Entity、Repository、领域对象、AI Provider |
| infrastructure | `server/src/infrastructure` | JSON 数据库、seed |
| client | `client` | 原生浏览器前端 |

## 与目标微服务差距

- 没有 `services/` 目录。
- 没有 `shared/` 目录。
- 没有独立服务端口。
- 没有 Gateway。
- 没有服务间 HTTP client。
- 没有内部 API。
- 没有按服务拆分数据文件。

