# v7 第一阶段代码蓝图

本文件给实现者提供落地骨架。代码片段不是最终实现，但模块边界、命名和 DTO 应尽量沿用。

## 1. Student Route Table

### `client/src/views/studentRouteTable.js`

```js
export const STUDENT_PRIMARY_ROUTES = [
  { route: "student-ai", label: "AI 学习台", icon: "sparkles" },
  { route: "student-learning", label: "学习", icon: "book-open" },
  { route: "student-assignments", label: "作业", icon: "clipboard-list" },
  { route: "student-practice", label: "练习与错题", icon: "target" },
  { route: "student-notes", label: "课程笔记", icon: "notebook" }
];

export const studentRouteTable = {
  "student-ai": { title: "AI 学习台", layout: "student" },
  "student-ai-insight": { title: "AI 分析结果", layout: "student" },
  "student-learning": { title: "学习", layout: "student" },
  "student-task-detail": { title: "学习任务详情", layout: "student" },
  "student-assignments": { title: "作业", layout: "student" },
  "student-assignment-detail": { title: "作业详情", layout: "student" },
  "student-submit": { title: "提交作业", layout: "student" },
  "student-assignment-history": { title: "作业历史", layout: "student" },
  "student-feedback": { title: "教师反馈", layout: "student" },
  "student-submit-preview": { title: "提交预览", layout: "student" },
  "student-submit-success": { title: "提交成功", layout: "student" },
  "student-practice": { title: "练习与错题", layout: "student" },
  "student-practice-session": { title: "练习答题", layout: "student" },
  "student-practice-result": { title: "练习结果", layout: "student" },
  "student-mistake-detail": { title: "错题详情", layout: "student" },
  "student-notes": { title: "课程笔记", layout: "student" },
  "student-note-editor": { title: "笔记编辑", layout: "student" },
  "student-note-ai-result": { title: "AI 笔记整理结果", layout: "student" }
};
```

## 2. Student Selectors

### `client/src/state/studentSelectors.js`

```js
export function selectStudentHomeModel(state) {
  const dashboard = state.dashboard || {};
  const assignments = state.assessment?.assignments || dashboard.assignments || [];
  const mistakes = state.assessment?.mistakes || [];
  const tasks = dashboard.tasks || [];

  return {
    user: state.user,
    goals: dashboard.goals || [],
    tasks,
    assignments,
    mistakes,
    metrics: dashboard.metrics || {},
    dailyPlan: state.student?.ai?.dailyPlan || null,
    pressure: buildAssignmentPressure(assignments),
    nextActions: buildNextActions({ tasks, assignments, mistakes })
  };
}

export function selectStudentAssignmentsModel(state) {
  const assignments = state.assessment?.assignments || state.dashboard?.assignments || [];
  const courses = state.dashboard?.courses || [];
  const mode = state.student?.assignments?.mode || "course";
  return {
    mode,
    courses,
    assignments,
    byCourse: groupAssignmentsByCourse(assignments, courses),
    calendarDays: groupAssignmentsByDate(assignments),
    deadlineList: sortByDueAt(assignments)
  };
}

export function selectStudentAiContext(state, route) {
  return {
    route,
    user: state.user,
    dashboard: state.dashboard,
    courses: state.dashboard?.courses || [],
    assignments: state.assessment?.assignments || state.dashboard?.assignments || [],
    assignmentDetail: state.assessment?.assignmentDetail || null,
    mistakes: state.assessment?.mistakes || [],
    practiceHistory: state.assessment?.practiceHistory || [],
    selected: state.selected,
    student: state.student
  };
}

function buildAssignmentPressure(assignments) {
  const now = Date.now();
  return assignments
    .filter((item) => item.dueAt)
    .map((item) => {
      const daysLeft = Math.ceil((new Date(item.dueAt).getTime() - now) / 86400000);
      return { ...item, daysLeft, urgency: daysLeft <= 2 ? "high" : daysLeft <= 5 ? "medium" : "low" };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
}
```

## 3. Student AI Adapter

### `client/src/ai/studentAiAdapter.js`

```js
export class StudentAiAdapter {
  constructor({ api }) {
    this.api = api;
  }

  async buildDailyPlan(context) {
    return this.askStructured(dailyPlanPrompt(context), normalizeDailyPlan);
  }

  async buildWeaknessInsight(context) {
    return this.askStructured(weaknessInsightPrompt(context), normalizeWeaknessInsight);
  }

  async draftLearningTask(context) {
    return this.askStructured(taskDraftPrompt(context), normalizeTaskDraft);
  }

  async guideAssignment(context) {
    return this.askStructured(assignmentGuidePrompt(context), normalizeAssignmentGuide);
  }

  async checkSubmissionDraft(context) {
    return this.askStructured(submissionCheckPrompt(context), normalizeSubmissionCheck);
  }

  async organizeNote(context) {
    return this.askStructured(noteOrganizePrompt(context), normalizeNoteOrganize);
  }

  async askStructured(prompt, normalize) {
    try {
      const result = await this.api.askAI(prompt);
      const text = result.data?.answer || result.data?.content || "";
      return normalize(parseJsonObject(text), text);
    } catch (error) {
      return normalize(null, "", error);
    }
  }
}
```

## 4. Student Shell

### `client/src/widgets/studentShell.js`

```js
export function studentShell({ state, title, content, aiPanel }) {
  return `
    <div class="student-app-shell">
      <aside class="student-sidebar">
        <div class="student-brand">
          <strong>EduMind</strong>
          <span>AI 学习台</span>
        </div>
        <nav class="student-nav"></nav>
      </aside>
      <main class="student-main">
        <header class="student-topbar">
          <button class="icon-btn student-back" data-action="student-back" aria-label="返回">←</button>
          <h1>${title}</h1>
        </header>
        ${content}
      </main>
      ${aiPanel}
      <nav class="student-bottom-nav"></nav>
    </div>
  `;
}
```

## 5. CSS 增量

```css
.student-app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr) 360px;
  background: var(--surface);
}

.student-sidebar {
  border-right: 1px solid var(--line);
  background: #fff;
  padding: 18px;
}

.student-main {
  min-width: 0;
  padding: 20px;
}

.student-ai-panel {
  border-left: 1px solid var(--line);
  background: #fff;
  padding: 18px;
}

.student-bottom-nav {
  display: none;
}

.student-ai-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.8fr);
  gap: 16px;
}

.student-hero-panel,
.student-panel {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  padding: 18px;
}

@media (max-width: 1180px) {
  .student-app-shell {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .student-ai-panel {
    display: none;
  }
}

@media (max-width: 760px) {
  .student-app-shell {
    display: block;
    padding-bottom: 68px;
  }

  .student-sidebar {
    display: none;
  }

  .student-main {
    padding: 14px;
  }

  .student-bottom-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    border-top: 1px solid var(--line);
    background: #fff;
  }
}
```

