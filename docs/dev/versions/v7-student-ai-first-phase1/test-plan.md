# v7 第一阶段测试计划

## 命令

```bash
npm test
npm run test:services
```

可选手工启动：

```bash
npm run start:services:mock
```

访问：

```text
http://127.0.0.1:4077/
```

## 自动化测试范围

### 前端模块测试

- `views/studentRouteTable.js` 可导入。
- `widgets/studentShell.js` 可导入。
- `widgets/studentAiPanel.js` 可导入。
- `views/student/*` 全部可导入，不依赖构建链。
- `state/studentSelectors.js` 可在空数据、部分数据、完整数据下稳定返回 ViewModel。
- `ai/studentAiAdapter.js` 在 mock/fallback 模式下返回符合 schema 的结构化对象。
- `ai/studentAiSchemas.js` 包含 daily plan、weakness insight、task draft、assignment guide、submission check、note organize schema。

### ApiClient 测试

覆盖学生端关键路径：

- `/api/dashboard`
- `/api/courses`
- `/api/tasks`
- `/api/tasks/:id/complete`
- `/api/assignments`
- `/api/assignments/:id`
- `/api/assignments/:id/submissions`
- `/api/question-banks`
- `/api/practice-sessions`
- `/api/practice-sessions/:id/answers`
- `/api/practice-sessions/:id/finish`
- `/api/mistakes`
- `/api/mistake-analysis`
- `/api/ai/ask`
- `/api/ai/plan`
- `/api/ai/summarize`

### Selector 测试

- `selectStudentAssignmentsModel` 能派生课程视图、日历视图、截止时间视图。
- `selectStudentSubmitModel` 在无 assignment id 时返回可恢复状态。
- `selectStudentPracticeSessionModel` 能计算已答数、总题数、当前题。
- `selectStudentAiContext` 能按不同 route 注入不同上下文。
- 空列表、缺字段、旧数据都不抛错。

### AI Adapter 测试

- `buildDailyPlan` 返回 `summary`、`actions`、`risks`、`questions`。
- `buildWeaknessInsight` 返回 `weaknesses`。
- `draftLearningTask` 返回 `draft`。
- `guideAssignment` 返回 `outline`、`checklist`。
- `checkSubmissionDraft` 返回 `completionEstimate`、`issues`。
- `organizeNote` 返回 `summary`、`cards`、`assignmentParagraphs`。
- AI 请求失败时返回 fallback，不抛到视图层。

## 手工验证

- 学生登录后默认进入 AI 学习台。
- 五个一级入口都可打开。
- AI 行动卡片可跳转到对应页面。
- 学习页可创建和完成任务。
- 作业三种视图可切换。
- 作业详情、提交、预览、成功页可走通。
- 提交失败保留草稿。
- 练习答题、完成、结果页可走通。
- 错题详情页可打开。
- 笔记可创建，AI 整理结果可展示。

## UI 回归

- 390px：底部导航可用，详情页不横向溢出。
- 768px：主内容和 AI 面板合理折叠。
- 1024px：左侧导航、主内容、右侧 AI 面板不重叠。
- 1440px：桌面三栏布局比例稳定。
- 所有按钮最小高度不低于 44px。
- 表单字段有 label。
- 错误显示在相关区域附近。
- loading/saving 状态可见。
- reduced motion 下不依赖动画表达状态。

