# API Delta

v11 以复用现有后端接口为主，不强制新增服务端业务接口。

## 复用接口

- `GET /api/dashboard`
- `GET /api/analytics/teacher`
- `GET /api/analytics/students/:id`
- `GET /api/assessment/course-report`
- `GET /api/assessment/student-portfolio`
- `GET /api/assessment/student-portfolio/deep`
- `GET /api/assessment/student-portfolio/evidence-map`
- `GET /api/assessment/student-portfolio/intervention-plan`
- `GET /api/assignments`
- `GET /api/assignments/:id`
- `GET /api/assignments/:id/grading-overview`
- `GET /api/submissions/:id/grading-insight`
- `GET /api/submissions/:id/student-ai-evidence`
- `GET /api/teacher/students/:id/ai-results`
- `GET /api/teacher/students/:id/ai-timeline`
- `POST /api/teacher/students/:id/interventions`
- `GET /api/notifications`
- `GET /api/scheduler/reminders`
- `GET /api/report/*`

## 展示层映射要求

- 接口返回内部 ID 时，UI 必须通过课程、学生、作业、班级字典映射为可读名称。
- 如果没有可读名称，显示“未命名课程/未命名学生/未命名作业”，不要直接回退到内部 ID。
- 内部 ID 只能出现在 `data-id`、请求参数、调试日志，不得出现在可见文本。

## 可选新增接口

只有在前端聚合成本过高时，才新增聚合接口：

- `GET /api/teacher/workspace`
- `GET /api/teacher/context-assistant`

新增接口必须只是聚合已有数据，不新增业务语义。

