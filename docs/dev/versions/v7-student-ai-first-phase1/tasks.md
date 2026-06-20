# v7 第一阶段任务清单

## 1. 文档与范围确认

- [x] 阅读 `prototypes/student-ai-first-v2/README.md`。
- [x] 阅读 `prototypes/student-ai-first-v2/INTERACTION_DESIGN.md`。
- [x] 阅读本版本全部文档。
- [x] 确认本阶段只做学生端，不做教师端。
- [x] 确认 AI/LangChain 本阶段只做 prompt、schema、adapter，不要求模型调试。

## 2. Student Shell 与路由

- [x] 新增 `views/studentRouteTable.js` 或等价 route table。
- [x] 新增 `widgets/studentShell.js`。
- [x] 新增 `widgets/studentBottomNav.js`。
- [x] 新增 `widgets/studentAiPanel.js`。
- [x] 学生登录后默认路由切到 `student-ai`。
- [x] 保留 v6 通用路由可访问。
- [x] 详情页支持返回上级页面。
- [x] 移动端显示底部五入口导航。

## 3. Student 状态与选择器

- [x] 扩展 `state/appState.js`，加入 `student` 状态。
- [x] 新增 `state/studentSelectors.js`。
- [x] 实现 `selectStudentHomeModel(state)`。
- [x] 实现 `selectStudentLearningModel(state)`。
- [x] 实现 `selectStudentAssignmentsModel(state)`。
- [x] 实现 `selectStudentAssignmentDetailModel(state)`。
- [x] 实现 `selectStudentSubmitModel(state)`。
- [x] 实现 `selectStudentPracticeModel(state)`。
- [x] 实现 `selectStudentPracticeSessionModel(state)`。
- [x] 实现 `selectStudentMistakeDetailModel(state)`。
- [x] 实现 `selectStudentNotesModel(state)`。
- [x] 实现 `selectStudentAiContext(state, route)`。

## 4. AI Adapter 与 Prompt

- [x] 新增 `client/src/ai/studentAiAdapter.js`。
- [x] 新增 `client/src/ai/studentPrompts.js`。
- [x] 新增 `client/src/ai/studentAiSchemas.js`。
- [x] 实现 `buildDailyPlan(context)` fallback。
- [x] 实现 `buildWeaknessInsight(context)` fallback。
- [x] 实现 `draftLearningTask(context)` fallback。
- [x] 实现 `guideAssignment(context)` fallback。
- [x] 实现 `checkSubmissionDraft(context)` fallback。
- [x] 实现 `organizeNote(context)` fallback。
- [x] 所有 adapter 输出必须符合 schema。
- [x] prompt 不散落在 view 文件中。

## 5. AI 学习台

- [x] 新增 `views/student/studentAiView.js`。
- [x] 展示当前目标、进度、今日建议。
- [x] 展示 AI 输入框和快捷指令。
- [x] 展示结构化行动卡片。
- [x] 行动卡片可跳转作业、学习、练习、笔记。
- [x] AI 失败时显示 fallback 建议。
- [x] 新增 `student-ai-insight` 页面展示薄弱点排序、证据和行动。

## 6. 学习页

- [x] 新增 `views/student/studentLearningView.js`。
- [x] 展示课程筛选。
- [x] 展示当前目标和进度。
- [x] 展示课程信息和当前课程任务。
- [x] 支持手动创建任务。
- [x] 支持完成任务。
- [x] 支持 AI 任务草稿。
- [x] 新增 `student-task-detail` 页面。
- [x] 任务详情展示步骤、完成标准、关联作业 fallback。

## 7. 作业页与提交闭环

- [x] 新增 `views/student/studentAssignmentsView.js`。
- [x] 作业支持按课程视图。
- [x] 作业支持日历视图。
- [x] 作业支持截止时间视图。
- [x] 新增 `student-assignment-detail` 页面。
- [x] 作业详情展示要求、状态、截止时间、提交入口。
- [x] 右侧 AI 面板展示作业拆解。
- [x] 新增 `forms/studentSubmissionForm.js`。
- [x] 新增 `student-submit` 页面。
- [x] 支持保存前端提交草稿。
- [x] 支持 AI 提交自检。
- [x] 新增 `student-submit-preview` 页面。
- [x] 调用 `POST /api/assignments/:id/submissions` 完成提交。
- [x] 新增 `student-submit-success` 页面。
- [x] 新增 `student-assignment-history` 页面。
- [x] 新增 `student-feedback` 页面。

## 8. 练习与错题

- [x] 新增 `views/student/studentPracticeView.js`。
- [x] 展示题库入口。
- [x] 展示 AI 推荐练习入口。
- [x] 展示错题回放。
- [x] 展示练习历史。
- [x] 新增 `student-practice-session` 页面。
- [x] 支持答题卡。
- [x] 支持提交答案。
- [x] 支持完成练习。
- [x] 新增 `student-practice-result` 页面。
- [x] 新增 `student-mistake-detail` 页面。
- [x] 错题详情展示原题、我的答案、正确答案、解析和 AI 建议。

## 9. 课程笔记

- [x] 新增 `views/student/studentNotesView.js`。
- [x] 按课程展示笔记入口。
- [x] 新增 `forms/studentNoteForm.js`。
- [x] 新增 `student-note-editor` 页面。
- [x] 支持创建笔记。
- [x] 支持 AI 笔记总结。
- [x] 新增 `student-note-ai-result` 页面。
- [x] AI 整理结果展示摘要、复习卡片、作业段落。
- [x] 保存整理结果时创建新笔记。

## 10. 样式

- [x] 增加 student shell 样式。
- [x] 增加右侧 AI 面板样式。
- [x] 增加行动卡片样式。
- [x] 增加作业三视图样式。
- [x] 增加提交页和预览页样式。
- [x] 增加练习答题卡和结果页样式。
- [x] 增加笔记编辑和整理结果样式。
- [x] 验证 390、768、1024、1440 宽度。
- [x] 避免横向溢出。
- [x] focus ring 可见。

## 11. 测试

- [x] 新增 student route table 导入测试。
- [x] 新增 student selectors 测试。
- [x] 新增 StudentAiAdapter schema/fallback 测试。
- [x] 新增 ApiClient 学生端关键 path 测试。
- [x] 新增 student views 可导入测试。
- [x] 保持 `npm test` 通过。
- [x] 保持 `npm run test:services` 通过。
