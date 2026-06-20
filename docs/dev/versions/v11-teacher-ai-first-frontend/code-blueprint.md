# Code Blueprint

## 路由

```js
const teacherViews = {
  "teacher-home": teacherHomeView,
  "teacher-course": teacherCourseView,
  "teacher-student": teacherStudentView,
  "teacher-assignment": teacherAssignmentView,
  "teacher-review": teacherReviewView,
  "teacher-intervention": teacherInterventionView,
  "teacher-report": teacherReportView
};
```

## 默认路由

```js
export function defaultRouteForTeacher(user, route = "") {
  if (user?.role !== "teacher" && user?.role !== "admin") {
    return route;
  }
  if (!route || route === "dashboard" || route === "analytics") {
    return "teacher-home";
  }
  return route.startsWith("teacher-") ? route : "teacher-home";
}
```

## 名称映射

```js
function displayCourseName(state, courseId) {
  const course = state.dashboard?.courses?.find((item) => item.id === courseId);
  return course?.title || "未命名课程";
}
```

任何页面不得写：

```js
course.courseId || course.id
```

作为直接展示文本。

## AI 助手模型

```js
export function selectTeacherAiPanelModel(state, route) {
  if (route === "teacher-student") {
    return {
      title: "学生干预助手",
      summary: buildStudentEvidenceSummary(state),
      actions: buildStudentInterventionActions(state),
      risks: buildStudentRisks(state)
    };
  }

  if (route === "teacher-assignment") {
    return {
      title: "批改助手",
      summary: buildAssignmentReviewSummary(state),
      actions: buildReviewActions(state),
      risks: buildReviewRisks(state)
    };
  }

  return {
    title: "教学工作台助手",
    summary: buildClassOverviewSummary(state),
    actions: buildTeacherDailyActions(state),
    risks: buildClassRisks(state)
  };
}
```

## CSS 结构

```css
.teacher-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 256px minmax(0, 1fr) 340px;
}

.teacher-main {
  display: grid;
  gap: 24px;
  padding: 24px;
}

.teacher-section {
  display: grid;
  gap: 14px;
}

.teacher-card {
  padding: 16px;
  display: grid;
  gap: 12px;
}

.teacher-action-row {
  display: flex;
  justify-content: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}
```

## 窄屏

```css
@media (max-width: 900px) {
  .teacher-shell {
    grid-template-columns: 1fr;
  }

  .teacher-ai-panel {
    order: 3;
  }
}
```

