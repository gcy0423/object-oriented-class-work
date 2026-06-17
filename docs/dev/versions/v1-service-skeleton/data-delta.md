# v1 数据变化

v1 不拆分业务数据，只为未来拆分准备配置和目录。

## 保持不变

当前业务数据仍保存在：

```text
data/app-data.json
```

## 可新增但不写业务数据的文件

服务骨架可以创建空数据文件，但 v1 不依赖它们：

```text
data/identity.json
data/learning.json
data/assessment.json
data/ai.json
data/collaboration.json
data/analytics.json
```

如果创建，内容必须是空集合结构或健康检查元数据，不迁移真实业务数据。

## 配置变量

新增端口和内部调用配置：

| 变量 | 默认值 |
| --- | --- |
| `GATEWAY_PORT` | 4077 |
| `IDENTITY_PORT` | 4101 |
| `LEARNING_PORT` | 4102 |
| `ASSESSMENT_PORT` | 4103 |
| `AI_PORT` | 4104 |
| `COLLABORATION_PORT` | 4105 |
| `ANALYTICS_PORT` | 4106 |
| `EDUMIND_INTERNAL_KEY` | `edumind-local-internal-key` |

## v1 禁止事项

- 禁止从 `app-data.json` 拆出真实业务数据。
- 禁止新增服务直接写入旧单体数据。
- 禁止让 Gateway 绕过服务边界读取数据文件。

