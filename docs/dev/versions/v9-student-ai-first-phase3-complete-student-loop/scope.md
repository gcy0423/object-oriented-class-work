# v9 范围

## 做什么

- 新增 AI 结果持久化和查询。
- 新增 AI action card 状态管理。
- 新增 AI task draft 持久化。
- 新增 assignment submission draft 后端能力。
- 新增本地文件上传能力。
- 补齐 notes CRUD。
- 学生端接入 notification/scheduler 相关能力。
- 新增 student AI timeline。
- 增加 AI 质量评测样例和测试。
- 强化知识库/知识图谱在学生 AI workflow 中的输入。
- 更新前端学生端页面，恢复持久化状态。

## 不做什么

- 不做教师端联动。
- 不做教师端 AI-first 页面。
- 不做生产级对象存储、CDN、断点续传。
- 不做复杂富文本。
- 不做复杂权限、多租户和正式班级隔离。
- 不做真实模型质量人工打分平台。

## 兼容要求

- v7 学生端路由不变。
- v8 `/api/student-ai/*` 继续可用。
- `StudentAiAdapter` 方法签名保持兼容。
- 旧 submission API 继续可用。
- 旧 notes 创建 API 继续可用。
- 普通测试不依赖外网和 LM Studio。

## 产品约束

- AI 建议必须可追踪：生成、完成、忽略、转任务等都要有记录。
- 草稿必须显式确认后才转为正式任务或提交。
- 文件上传失败不能导致正文草稿丢失。
- 通知提醒不能打断主流程，只作为入口和提醒。
- 知识图谱证据必须以可读文本出现在 AI 建议的 evidence 中。

