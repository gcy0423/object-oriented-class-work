# 版本化开发文档约定

本目录保存每个开发版本的执行文档。这里的文档面向开发，不用于课程展示；重点是约束范围、接口、数据、测试和验收。

## 目录规则

每个版本使用独立文件夹：

```text
docs/dev/versions/
  v0-current-monolith/
  v1-service-skeleton/
  v2-identity-learning/
  v3-ai-collaboration/
  v4-assessment/
  v5-analytics-frontend/
  v6-frontend-workbench/
```

版本文件夹一旦进入开发，除非发现错误，不随意重写历史结论。后续变化写到下一个版本的 delta 文档中。

## 固定文档集

每个版本默认包含以下文件：

| 文件 | 用途 |
| --- | --- |
| `README.md` | 版本目标、范围、启动方式、验收标准、已知限制 |
| `scope.md` | 本版本做什么、不做什么 |
| `architecture-delta.md` | 相对上个版本的架构变化 |
| `api-delta.md` | 新增、修改、废弃接口 |
| `data-delta.md` | 数据文件、collection、字段和迁移规则 |
| `tasks.md` | 开发任务清单、涉及文件、验收方式 |
| `test-plan.md` | 本版本测试范围和验证命令 |
| `acceptance.md` | 版本完成前必须逐项确认的清单 |

## 写作约束

- 写开发事实，不写宣传话术。
- 写清楚“不做什么”，避免范围蔓延。
- 每个接口变化必须能映射到代码任务。
- 每个数据变化必须说明所有权和迁移方式。
- 每个版本必须能独立判断完成或未完成。
- 文档与代码冲突时，先更新文档再改代码。

## 版本节奏

| 版本 | 目标 |
| --- | --- |
| `v0-current-monolith` | 固定当前单体基线 |
| `v1-service-skeleton` | 建立微服务骨架、Gateway、shared 基础设施和健康检查 |
| `v2-identity-learning` | 迁移登录、用户、课程、目标、任务、笔记 |
| `v3-ai-collaboration` | 迁移 AI、知识库、协作消息、活动日志、SSE |
| `v4-assessment` | 新增作业、题库、练习、Rubric、评分、错题本 |
| `v5-analytics-frontend` | 新增统计分析、教师工作台、前端完整接入 |
| `v6-frontend-workbench` | 扩展前端工作台完整页面，并拆分 views/forms/widgets/state/utils |
