# Tasks

## 1. 教师端 shell

- 对照 `prototypes/teacher-ai-first` 提取教师端 shell、导航、主内容区、AI 助手区。
- 新增 `teacherRuntime.js`。
- 新增 `teacherShell.js`、`teacherSidebar.js`、`teacherAiPanel.js`。
- 教师登录后默认进入 `teacher-home`。
- 首屏加载保持教师 shell，不闪旧工作台。

## 2. 教师端 selector

- 新增 `teacherSelectors.js`。
- 统一聚合 dashboard、analytics、assessment、notification、scheduler 数据。
- 建立 ID 到可读名称的映射。
- 输出右侧 AI 助手模型。

## 3. 页面重写

以下页面必须先对齐 `prototypes/teacher-ai-first` 的信息层级和布局节奏，再接后端数据：

- `teacherHomeView`
- `teacherCourseView`
- `teacherStudentView`
- `teacherAssignmentView`
- `teacherReviewView`
- `teacherInterventionView`
- `teacherReportView`

每个页面必须有：

- 页面标题区。
- 主要指标区。
- 至少一个核心任务区。
- 上下文 AI 助手内容。
- 空态和加载态。

## 4. 布局修复

- 对照原型检查每个页面的 section 节奏、卡片密度和操作区位置。
- 为 section、panel、card 建立稳定 gap。
- 为所有卡片建立 padding。
- 操作按钮组左对齐。
- 去掉不必要的 `space-between`。
- 窄屏下按钮自然换行。

## 5. 无内部 ID

- 扫描教师端所有展示文本。
- 禁止展示内部 ID。
- 对缺失展示名提供可读 fallback。

## 6. AI 上下文助手

- 首页展示班级级摘要。
- 课程页展示课程级摘要。
- 学生页展示学生级证据和干预建议。
- 作业页展示批改与提交风险。
- 干预页展示跟进建议。

## 7. 验证

- 运行 `npm test`。
- 运行 `npm run test:services`。
- 用浏览器检查桌面和窄屏布局。
- 检查首屏和路由切换是否闪旧界面。
