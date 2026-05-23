# EduMind Agent 智学伴

EduMind Agent 是一个面向《面向对象技术与方法》结课设计的团队项目：智能学习计划与协作系统。项目采用浏览器前端 + Node.js 后端的前后端分离方式，后端按领域对象、应用服务和基础设施分层，内置可替换 LLM Provider，并通过 Server-Sent Events 实现多端实时同步。

## 功能

- 学生/教师演示登录与轻量鉴权
- 课程、学习目标、任务和笔记管理
- AI 课程问答、学习计划生成、笔记摘要
- 协作消息与活动日志
- JSON 文件持久化，无需安装数据库
- 原生 Web 前端，可作为桌面浏览器或移动端 PWA 访问

## 运行环境

- Node.js 20 或更高版本
- 不需要 `npm install`，项目只使用 Node.js 内置模块和浏览器原生能力
- 如果本机没有全局 Node.js，可以使用项目内便携运行时：`start-local.cmd`、`test-local.cmd`、`verify-lmstudio-local.cmd`

## 启动

```bash
npm start
```

或在 Windows 下直接双击/执行：

```bat
start-local.cmd
```

默认地址：

```text
http://127.0.0.1:4077
```

演示账号：

```text
student@edumind.local / 学生
teacher@edumind.local / 教师
```

## AI 服务配置：LM Studio 本地模型

项目默认接入团队本地 LM Studio 服务。请在 LM Studio 中启动 `qwen3.5-9b-glm5.1-distill-v1`，打开 OpenAI-compatible Server，并确认服务地址为 `http://172.25.160.1:1234`。后端会自动使用 `/v1/chat/completions` 接口。

```bash
set LLM_PROVIDER=lmstudio
set LLM_MODEL=qwen3.5-9b-glm5.1-distill-v1
set LLM_ENDPOINT=http://172.25.160.1:1234
set LLM_TIMEOUT_MS=90000
set LLM_MAX_TOKENS=1024
npm start
```

如果只想离线演示基础功能，可以使用 Mock Provider：

```bash
npm run start:mock
```

## 测试

```bash
npm test
npm run test:lmstudio
```

如果使用项目内便携 Node.js：

```bat
test-local.cmd
verify-lmstudio-local.cmd
```

`npm test` 验证登录、学习流程、Mock AI 与 LM Studio Provider 配置；`npm run test:lmstudio` 会真实请求 LM Studio 本地模型，用于提交前确认 AI 接入可用。

## 代码量统计

```bash
npm run linecount
```

当前团队项目源码统计超过 50000 行，主要包括 Server 端、Client 端、测试脚本、截图脚本和 AI 本地课程资源目录。

## 目录结构

```text
client/                 Web 前端
server/src/domain/       领域对象与仓储接口
server/src/application/  应用服务、鉴权、AI 编排、控制器
server/src/framework/    HTTP、路由、SSE、错误处理
server/src/infrastructure/JSON 持久化与种子数据
test/                   Node.js 内置测试
docs/                   结课设计文档与截图
```
