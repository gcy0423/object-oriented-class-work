# v9 任务清单

## 1. AI 结果与行动持久化

- [ ] 新增 studentAiResults repository。
- [ ] 新增 studentAiActions repository。
- [ ] v8 六个 AI workflow 生成后保存 result。
- [ ] 查询最近 AI results。
- [ ] 查询单个 AI result。
- [ ] 更新 action 状态。
- [ ] 前端行动卡片显示状态。

## 2. AI 任务草稿

- [ ] 保存 task draft。
- [ ] 查询 task draft 列表。
- [ ] 编辑 task draft。
- [ ] 删除 task draft。
- [ ] 确认 task draft 创建真实 task。
- [ ] 前端学习页显示后端草稿。

## 3. 提交草稿

- [ ] assessment-service 新增 submissionDrafts。
- [ ] 查询当前学生提交草稿。
- [ ] 创建/更新提交草稿。
- [ ] 删除提交草稿。
- [ ] 草稿关联 AI 自检结果。
- [ ] 草稿一键提交为正式 submission。
- [ ] 前端提交页加载草稿。

## 4. 文件上传

- [ ] 新增 uploads collection。
- [ ] 新增上传 API。
- [ ] 新增获取文件 API。
- [ ] 新增删除上传 API。
- [ ] 前端提交页支持选择/上传文件。
- [ ] submission attachments 使用 upload URL。

## 5. Notes CRUD

- [ ] learning-service 新增 `GET /api/notes`。
- [ ] 新增 `GET /api/notes/:id`。
- [ ] 新增 `PATCH /api/notes/:id`。
- [ ] 新增 `DELETE /api/notes/:id`。
- [ ] 前端笔记页接真实列表。
- [ ] 前端笔记编辑页支持编辑和删除。
- [ ] 笔记搜索/课程筛选可用。

## 6. 笔记整理历史

- [ ] 保存 note organize result。
- [ ] 查询 note organize history。
- [ ] 整理结果保存为新笔记。
- [ ] 前端展示历史整理结果。

## 7. 通知、提醒、时间线

- [ ] 学生端加载 notifications。
- [ ] 学生端加载 scheduler reminders。
- [ ] 草稿未提交提醒。
- [ ] 作业截止提醒。
- [ ] AI 建议提醒。
- [ ] 新增 student AI timeline 聚合。
- [ ] 前端 AI 学习台展示 timeline。

## 8. AI 质量评测

- [ ] 新增 prompt fixture。
- [ ] 新增 expected schema fixture。
- [ ] 测试六个 workflow 的 schema 稳定性。
- [ ] 测试 fallback 内容可读。
- [ ] 测试 prompt 不要求 HTML 输出。

## 9. 知识图谱联动

- [ ] daily plan 可引用知识点摘要。
- [ ] weakness insight 可引用知识点 evidence。
- [ ] assignment guide 可引用知识库建议。
- [ ] practice recommendation 可引用 concept ids。
- [ ] 前端展示知识点 evidence。

## 10. 测试

- [ ] `npm test` 通过。
- [ ] `npm run test:services` 通过。
- [ ] 上传测试不写出 workspace 之外。
- [ ] 删除/确认草稿测试覆盖权限。

