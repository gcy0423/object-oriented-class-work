# v0 测试计划

## 普通测试

```bash
npm test
```

覆盖：

- 登录与 Token。
- 学习目标、任务、进度。
- Mock AI。
- LM Studio Provider 配置选择。
- OpenAI-compatible Provider fallback。

## LM Studio 测试

```bash
npm run test:lmstudio
```

要求：

- LM Studio 已启动 OpenAI-compatible Server。
- 模型为 `qwopus3.6-27b-v2-mtp@iq4_xs`。
- 默认地址为 `http://10.108.10.110:1234/v1/chat/completions`。

## 当前环境注意

测试机器必须有 Node.js 20+。如果没有系统 Node.js，则需要 `.runtime/node-v20.20.2-win-x64`。

