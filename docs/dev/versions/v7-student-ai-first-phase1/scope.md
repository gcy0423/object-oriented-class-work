# v7 第一阶段范围

## 做什么

- 基于 `prototypes/student-ai-first-v2/` 改写真实学生端前端。
- 新增学生端专属 route table、shell、导航和页面模块。
- 建立 AI 学习台、学习、作业、练习与错题、课程笔记五个一级页面。
- 建立作业详情、提交、预览、成功、历史、反馈等作业详情流。
- 建立练习答题、练习结果、错题详情等练习详情流。
- 建立学习任务详情、笔记编辑、AI 笔记整理结果等内容详情流。
- 接入当前后端已有 API，不把已有能力继续做成静态原型。
- 增加 student 视角选择器，把 dashboard、assignments、practice、mistakes、notes 派生成页面 ViewModel。
- 增加 student AI adapter，短期 fallback 到 `/api/ai/ask`、`/api/ai/plan`、`/api/ai/summarize`。
- 为未来 LangChain 实现定义结构化 prompt 输入和输出 DTO。
- 补齐学生端移动端布局。
- 增加前端轻量测试，覆盖路由、selector、adapter path、关键视图可导入。

## 不做什么

- 不实现教师端 `teacher-ai-first`。
- 不新增 React/Vue 等前端框架。
- 不引入 npm 构建链。
- 不实现完整 LangChain 运行时。
- 不真实调试模型效果。
- 不新增数据库或队列。
- 不实现真实附件上传。
- 不实现完整笔记 CRUD 后端；本阶段只接已有 `POST /api/notes` 和 `POST /api/ai/summarize`。
- 不实现 AI 会话永久历史。
- 不改 `services/*` 的领域边界，除非为了暴露已有能力做极小 Gateway 代理修正。

## 兼容要求

v7 第一阶段不能破坏以下能力：

- v6 的 dashboard、learning、assignments、question-banks、practice、analytics、ai、team、settings 路由。
- 登录、退出、token 保存。
- Gateway 静态托管 `client/`。
- `/api/dashboard` 聚合。
- assessment 的 assignment、practice、mistake、question-bank API。
- AI ask、plan、summarize。
- `npm test` 中现有前端模块导入和 ApiClient path 测试。
- `npm run test:services` 中现有 Gateway 和服务代理测试。

## UI/UX 约束

- 以 `student-ai-first-v2` 为页面结构和交互优先级，不照搬 v6 数据密集型教师工作台。
- AI 是入口，但手动入口必须保留。
- 左侧桌面导航只放一级入口：AI、学习、作业、练习与错题、课程笔记。
- 详情页不得出现在左侧一级导航。
- 桌面端使用主工作区 + 右侧 AI 上下文助手。
- 移动端隐藏桌面侧栏，使用顶部栏和底部五入口导航。
- 写入动作必须有确认或明确按钮：创建任务、提交作业、保存笔记、生成练习。
- AI 输出必须先变成结构化行动卡片、建议、风险、问题列表，再渲染到 UI。
- 页面不能因为某个 API 失败整体白屏。

## 风险控制

- 先建立 student route 和 shell，再迁移具体页面。
- 已有 v6 页面保留，学生端新页面可以与旧页面并存。
- 每个页面先接后端真实读接口，再补写操作。
- 后端缺口先通过 adapter fallback，不在视图里散落 prompt 字符串。
- 所有 prompt、输入 DTO、输出 DTO 集中放在 `client/src/ai/` 或等价目录。
- AI adapter 必须能在 mock/fallback 模式下返回稳定结构，保证 UI 可测试。

