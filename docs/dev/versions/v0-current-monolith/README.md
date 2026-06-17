# v0-current-monolith

本版本记录当前真实基线：项目是前后端分离的 Node.js 模块化单体，不是真实微服务。后续所有微服务改写都以本版本为起点。

## 当前目标

- 固定当前代码结构、接口、数据和测试状态。
- 明确哪些文档说法与代码有差异。
- 为 v1 微服务骨架改造提供基线。

## 当前运行方式

```bash
npm start
npm test
npm run test:lmstudio
```

Windows 便携 Node 脚本：

```bat
start-local.cmd
test-local.cmd
verify-lmstudio-local.cmd
```

注意：当前仓库未包含 `.runtime` 目录时，仍需要系统安装 Node.js 20+。

## 当前架构

- 一个 Node.js 进程同时提供静态前端和 API。
- 后端内部按 `framework / application / domain / infrastructure` 分层。
- `AppKernel` 在一个进程中组装所有 repository 和 service。
- `JsonDatabase` 使用单个 `data/app-data.json` 文件保存所有集合。
- `DomainEventBus` 和 `SyncHub` 在进程内完成事件和 SSE。

## 当前功能

- 演示登录。
- 当前用户。
- 学习 Dashboard。
- 课程列表。
- 学习目标、任务、笔记。
- AI 问答、计划生成、笔记摘要。
- 协作消息。
- 活动日志。
- SSE 多端刷新。

## 当前限制

- 不是真实微服务。
- 服务不能独立启动、独立部署。
- 所有业务共享一个 JSON 数据文件。
- 没有 Gateway 转发层。
- 没有内部服务鉴权。
- 没有服务间 HTTP 调用。
- 代码量主要由生成知识库贡献。

## 版本验收

v0 不需要新增功能。只要当前代码结构、接口和限制被文档固定，即视为完成。

