# v7-student-ai-first-phase1

v7 第一阶段在 v6 已完成服务化 API、前端模块拆分和评测工作台的基础上，聚焦学生端 AI-first 前端重写。目标是以 `prototypes/student-ai-first-v2/` 为产品与交互蓝本，把当前 `client/` 中学生视角页面升级为真实可用的 AI-first 学习工作台。

本阶段优先完成前端体验和现有后端能力接入；AI 能力按 prompt + LangChain 的结构化输出方式预留 adapter 和 DTO，但不要求本阶段真实调通 LangChain 或本地模型。

## 版本目标

- 学生端默认入口改为 AI 学习台，而不是传统 dashboard。
- 按 `student-ai-first-v2` 建立学生端页面层级：AI、学习、作业、练习与错题、课程笔记，以及各自详情页。
- 复用 v6 前端分层：`views/`、`forms/`、`widgets/`、`state/`、`utils/`。
- 接入当前后端已有能力：dashboard、courses、tasks、assignments、submissions、practice、mistakes、notes、AI ask/plan/summarize。
- 为后端暂缺的 AI-first 功能建立前端 adapter：AI 今日建议、任务草稿、作业拆解、提交自检、笔记整理结果。
- 关键写操作补齐 saving、error、success、confirm 状态。
- 保持无构建链：不引入 React、Vue、Vite、Webpack、Tailwind 编译链或 TypeScript。
- 桌面端保留左侧一级导航 + 主工作区 + 右侧 AI 上下文助手；移动端使用顶部栏 + 底部导航 + 单列内容。

## 本版本不做

- 不重写教师端 AI-first 原型。
- 不删除 v6 工作台能力。
- 不新增大型后端服务。
- 不要求真实调试 LangChain、本地模型或 LM Studio。
- 不实现真实文件上传服务；附件先保留 URL/文本描述方式。
- 不实现富文本编辑器。
- 不实现完整 AI 会话线程持久化。
- 不做生产级权限、多租户和复杂班级边界校验。

## 目标页面

| 路由 | 页面 | 类型 |
| --- | --- | --- |
| `student-ai` | AI 学习台 | 一级 |
| `student-ai-insight` | AI 分析结果 | 详情 |
| `student-learning` | 学习 | 一级 |
| `student-task-detail` | 学习任务详情 | 详情 |
| `student-assignments` | 作业 | 一级 |
| `student-assignment-detail` | 作业详情 | 详情 |
| `student-submit` | 作业提交 | 详情 |
| `student-assignment-history` | 作业历史 | 详情 |
| `student-feedback` | 教师反馈 | 详情 |
| `student-submit-preview` | 提交预览 | 详情 |
| `student-submit-success` | 提交成功 | 详情 |
| `student-practice` | 练习与错题 | 一级 |
| `student-practice-session` | 练习答题 | 详情 |
| `student-practice-result` | 练习结果 | 详情 |
| `student-mistake-detail` | 错题详情 | 详情 |
| `student-notes` | 课程笔记 | 一级 |
| `student-note-editor` | 笔记编辑 | 详情 |
| `student-note-ai-result` | AI 笔记整理结果 | 详情 |

## 目标启动命令

```bash
npm run start:services:mock
npm run test:services
npm test
```

浏览器访问：

```text
http://127.0.0.1:4077/
```

## 版本完成标准

- 学生登录后默认进入 `student-ai`。
- 学生端五个一级入口与详情页可完整点击流转。
- 作业查看、提交、预览、成功页闭环可用。
- 练习入口、答题、完成、结果、错题详情闭环可用。
- 学习页可展示课程、目标、任务，并支持创建/完成任务。
- 笔记页可创建笔记，并可调用 AI 总结。
- AI 学习台使用结构化 ViewModel 渲染行动卡片，不直接依赖自然语言解析。
- 后端已有功能不得使用静态假数据替代。
- 后端暂缺功能必须通过 adapter 明确标记 fallback 行为。
- `npm run test:services` 和 `npm test` 通过。

