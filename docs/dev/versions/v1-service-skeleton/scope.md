# v1 范围

## 做什么

- 建立微服务目录骨架。
- 抽取或复制共享 HTTP 基础设施。
- 建立统一服务启动函数。
- 建立 Gateway。
- 建立健康检查。
- 建立内部 HTTP client。
- 建立内部调用密钥校验。
- 增加启动脚本。

## 不做什么

- 不改变前端 API 调用路径。
- 不迁移 `AuthService`。
- 不迁移 `LearningService`。
- 不迁移 `AITutorService`。
- 不迁移 `CollaborationService`。
- 不拆数据文件。
- 不引入 Docker、消息队列、数据库。

## 风险控制

- `server/src` 目录保持可运行。
- v1 新代码尽量不修改现有业务文件。
- Gateway 初期可以只处理静态文件和健康检查。
- 服务目录中的业务服务初期可以只有 health route。

