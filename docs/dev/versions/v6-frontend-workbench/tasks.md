# v6 任务清单

## 1. 前端目录拆分

- [ ] 新建 `client/src/state/`。
- [ ] 新建 `client/src/utils/`。
- [ ] 新建 `client/src/widgets/`。
- [ ] 新建 `client/src/forms/`。
- [ ] 新建 `client/src/views/`。
- [ ] 将 `escapeHtml`、`formatDate` 等工具迁移到 `utils/format.js` 或 `utils/dom.js`。
- [ ] 将 Store 迁移到 `state/viewState.js`，保留兼容导出。
- [ ] 将导航、shell、topbar 拆到 `widgets/layout.js`。

## 2. 状态与选择器

- [ ] 新增 `state/appState.js`。
- [ ] 新增 `state/selectors.js`。
- [ ] 增加 `loading`、`saving`、`errors`、`filters`、`selected`、`draft`。
- [ ] 实现 `canManageAssessment(user)`。
- [ ] 实现 `selectAssignmentViewModel(state)`。
- [ ] 实现 `selectQuestionBankViewModel(state)`。
- [ ] 实现 `selectPracticeViewModel(state)`。
- [ ] 实现 `selectAnalyticsViewModel(state)`。

## 3. API 层补齐

- [ ] `ApiClient` 新增 `updateAssignment`。
- [ ] `ApiClient` 新增 `deleteAssignment`。
- [ ] `ApiClient` 新增 `createQuestionBank`。
- [ ] `ApiClient` 新增 `updateQuestionBank`。
- [ ] `ApiClient` 新增 `deleteQuestionBank`。
- [ ] `ApiClient` 新增 `createQuestion`。
- [ ] `ApiClient` 新增 `updateQuestion`。
- [ ] `ApiClient` 新增 `deleteQuestion`。
- [ ] `ApiClient` 新增 `practiceSessions`。
- [ ] `ApiClient` 新增 `health`。
- [ ] 若后端缺少对应 API，则同步补 assessment-service 和 Gateway 代理。

## 4. 作业管理页

- [ ] 新增 `views/assignmentManageView.js`。
- [ ] 新增 `forms/assignmentForm.js`。
- [ ] 新增 `forms/gradingForm.js`。
- [ ] 支持教师发布作业。
- [ ] 支持教师编辑作业。
- [ ] 支持状态、课程、关键字筛选。
- [ ] 支持查看作业详情和提交列表。
- [ ] 支持人工评分。
- [ ] 支持触发 AI 初评并展示结果。
- [ ] 学生视角隐藏教师写操作。

## 5. 题库管理页

- [ ] 新增 `views/questionBankManageView.js`。
- [ ] 新增 `forms/questionBankForm.js`。
- [ ] 新增 `forms/questionForm.js`。
- [ ] 支持题库新增、编辑、删除。
- [ ] 支持题目新增、编辑、删除。
- [ ] 支持单选、多选、简答、代码阅读题型。
- [ ] 支持答案和解析编辑。
- [ ] 支持课程、题型、难度、关键字筛选。

## 6. 练习页

- [ ] 新增 `views/practiceView.js`。
- [ ] 新增 `widgets/practiceCard.js` 或放入 `widgets/cards.js`。
- [ ] 展示题库入口。
- [ ] 展示答题卡。
- [ ] 展示当前练习进度。
- [ ] 支持提交答案。
- [ ] 支持完成练习。
- [ ] 展示错题回放。
- [ ] 展示练习历史。

## 7. 统计页

- [ ] 扩展 `views/analyticsView.js`。
- [ ] 新增 `widgets/charts.js`。
- [ ] 新增课程统计卡片。
- [ ] 新增学生画像列表。
- [ ] 新增作业完成率条形图。
- [ ] 新增掌握度条形图。
- [ ] 新增风险学生区域。
- [ ] 图表提供文本值和表格替代。

## 8. 设置页

- [ ] 新增 `views/settingsView.js`。
- [ ] 新增 `forms/profileForm.js`。
- [ ] 新增 `forms/modelConfigPanel.js`。
- [ ] 新增 `widgets/health.js`。
- [ ] 展示用户资料。
- [ ] 展示模型配置说明。
- [ ] 展示服务健康面板。
- [ ] 支持刷新健康状态。

## 9. 样式

- [ ] 重整 `styles.css` 分区。
- [ ] 新增筛选器行样式。
- [ ] 新增工具栏样式。
- [ ] 新增表单错误样式。
- [ ] 新增保存中按钮样式。
- [ ] 新增条形图样式。
- [ ] 新增答题卡样式。
- [ ] 新增设置页健康状态样式。
- [ ] 补齐 `prefers-reduced-motion`。
- [ ] 验证 375、768、1024、1440 宽度。

## 10. 测试

- [ ] 新增前端模块导入测试。
- [ ] 新增 ApiClient path 测试。
- [ ] 新增工具函数测试。
- [ ] 新增 selectors 测试。
- [ ] 补 assessment CRUD 服务测试。
- [ ] 补 Gateway 代理测试。
- [ ] 保持 v1-v5 服务测试通过。
- [ ] 保持 `npm test` 通过。

