# v9 测试计划

## 命令

```bash
npm test
npm run test:services
```

## 自动化测试

- AI result 保存、查询、action 状态更新。
- AI task draft 保存、编辑、确认、删除。
- submission draft 保存、恢复、正式提交。
- upload 创建、读取、删除。
- notes list/detail/update/delete。
- note organize result 保存和 save-note。
- notifications/reminders 在学生端 ViewModel 中可见。
- timeline 聚合稳定。
- prompt fixture 和 schema fixture 测试。
- knowledge evidence 出现在 AI workflow 输出。

## 手工验证

- 刷新 AI 学习台后能看到最近建议。
- 行动卡片完成/忽略后刷新仍保留状态。
- 任务草稿刷新不丢。
- 提交草稿刷新不丢。
- 上传附件后可随作业提交。
- 笔记可编辑、删除、搜索。
- AI 整理历史可查看。
- 通知提醒可读、可标记已读。
- 时间线展示 AI 建议、任务、提交、练习和笔记。

