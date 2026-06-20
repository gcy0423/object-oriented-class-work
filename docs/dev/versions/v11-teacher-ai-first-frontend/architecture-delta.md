# Architecture Delta

## 前端结构变化

新版教师端架构以 `prototypes/teacher-ai-first` 为原型来源。页面组织、导航入口、右侧 AI 助手位置和教师主工作流必须先对齐原型，再接入现有后端数据。

新增教师端专属运行层，避免继续把教师页面塞进旧 `shellLayout`：

```text
client/src/
  teacherRuntime.js
  views/teacher/
    teacherHomeView.js
    teacherCourseView.js
    teacherStudentView.js
    teacherAssignmentView.js
    teacherReviewView.js
    teacherInterventionView.js
    teacherReportView.js
  widgets/
    teacherShell.js
    teacherSidebar.js
    teacherAiPanel.js
    teacherContextHeader.js
    teacherMetricStrip.js
  state/
    teacherSelectors.js
```

## 路由策略

- 教师登录后默认进入新版教师首页。
- 教师专属路由使用 `teacher-*` 前缀。
- 旧 `dashboard`、`analytics`、`assessment-insight` 等页面可作为过渡数据来源，但不作为新版教师端首屏。
- 路由切换时保持 teacher shell，不闪回旧布局。

## AI 助手策略

右侧 AI 助手由 `teacherSelectors` 根据当前路由、选中课程、选中学生、选中作业和风险数据生成：

- `teacher-home`：班级风险、待批改、今日干预建议。
- `teacher-course`：课程掌握度、薄弱概念、作业压力。
- `teacher-student`：学生 AI 行动、提交证据、个性化干预。
- `teacher-assignment`：提交质量、Rubric 风险、批改建议。
- `teacher-intervention`：干预优先级、提醒文案、跟进风险。

## 视觉布局原则

- 原型中的教师端 shell 是实现基准，不能回退到旧 `shellLayout` 的堆叠式工作台。
- Shell 使用稳定三栏：左侧栏、主内容、右侧 AI 助手。
- 页面主体使用垂直节奏，不允许 section 贴 section。
- 卡片作为信息单元，必须有 padding、标题、内容、动作分区。
- 操作按钮组默认左对齐，不使用整行 `space-between` 拉开。
