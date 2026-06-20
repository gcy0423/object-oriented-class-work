# v7 第一阶段实现提示词

下面的提示词用于启动 `v7-student-ai-first-phase1` 阶段开发。

```text
请开始实现 docs/dev/versions/v7-student-ai-first-phase1/ 定义的 v7 第一阶段。

开发前必须阅读并遵守：
- docs/dev/architecture.md
- docs/dev/service-boundaries.md
- docs/dev/api-contracts.md
- docs/dev/migration-plan.md
- prototypes/student-ai-first-v2/README.md
- prototypes/student-ai-first-v2/INTERACTION_DESIGN.md
- docs/dev/versions/v7-student-ai-first-phase1/README.md
- docs/dev/versions/v7-student-ai-first-phase1/scope.md
- docs/dev/versions/v7-student-ai-first-phase1/architecture-delta.md
- docs/dev/versions/v7-student-ai-first-phase1/api-delta.md
- docs/dev/versions/v7-student-ai-first-phase1/data-delta.md
- docs/dev/versions/v7-student-ai-first-phase1/tasks.md
- docs/dev/versions/v7-student-ai-first-phase1/test-plan.md
- docs/dev/versions/v7-student-ai-first-phase1/acceptance.md
- docs/dev/versions/v7-student-ai-first-phase1/code-blueprint.md

本阶段目标：
1. 以 prototypes/student-ai-first-v2 为蓝本，重写真实学生端前端。
2. 学生登录后默认进入 AI 学习台。
3. 建立学生端五个一级入口：AI 学习台、学习、作业、练习与错题、课程笔记。
4. 建立作业详情、提交、预览、成功、历史、反馈等详情页。
5. 建立练习答题、练习结果、错题详情等详情页。
6. 建立学习任务详情、笔记编辑、AI 笔记整理结果等详情页。
7. 接入已有后端 API，不把已有能力做成静态假数据。
8. 增加 StudentAiAdapter、studentPrompts、studentAiSchemas，为 LangChain/prompt 实现预留结构。
9. AI 功能本阶段以结构化 fallback 和 adapter 为主，不要求真实调试模型。
10. 保持无构建依赖，继续使用原生 HTML、CSS、ESM。

本阶段明确不做：
1. 不实现 teacher-ai-first。
2. 不引入 React、Vue、Vite、Webpack、Tailwind 编译链或 TypeScript。
3. 不新增大型后端服务。
4. 不实现真实文件上传。
5. 不实现完整 AI 会话持久化。
6. 不要求 LM Studio 或 LangChain 真实运行通过。

实现顺序：
1. 先新增 student route table 和 student shell。
2. 扩展 app state，加入 student 状态。
3. 新增 student selectors。
4. 新增 StudentAiAdapter、prompts、schemas。
5. 实现 AI 学习台和 AI 分析结果页。
6. 实现学习页和任务详情页。
7. 实现作业列表、详情、提交、预览、成功、历史、反馈。
8. 实现练习与错题、练习答题、练习结果、错题详情。
9. 实现课程笔记、笔记编辑、AI 整理结果。
10. 补样式和移动端适配。
11. 补前端测试。
12. 运行 npm test 和 npm run test:services。

UI 要求：
1. 桌面端保留左侧一级导航、主工作区、右侧 AI 上下文助手。
2. 移动端使用顶部栏和底部五入口导航。
3. 详情页通过内容钻取进入，不出现在一级导航。
4. 写操作必须有 saving 状态。
5. AI 输出必须是结构化行动卡片、建议、风险、问题列表，不直接依赖自然语言解析。
6. 后端缺失能力必须通过 adapter fallback 明确处理。
7. 页面局部 API 失败不能导致整个应用白屏。

完成后请按 docs/dev/versions/v7-student-ai-first-phase1/acceptance.md 给出验收结果。
```

短指令：

```text
实现 v7-student-ai-first-phase1：基于 prototypes/student-ai-first-v2，把学生端重写成真实 AI-first 前端；接入现有后端 API；新增 StudentAiAdapter/prompt/schema 作为 LangChain 预留层；保持无构建链和 v6 兼容。
```

