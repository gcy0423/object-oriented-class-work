# v7 第一阶段验收清单

## 文档

- [x] README、scope、architecture-delta、api-delta、data-delta、tasks、test-plan、acceptance、implementation-prompt、code-blueprint 均存在。
- [x] 文档范围只覆盖 student-ai-first-v2。
- [x] 文档明确 AI/LangChain 本阶段不调试模型。
- [x] 文档明确后端暂缺功能的 adapter fallback 策略。

## 路由和 Shell

- [x] 学生登录后默认进入 `student-ai`。
- [x] 桌面端左侧导航只有五个一级入口。
- [x] 详情页不出现在一级导航。
- [x] 移动端底部导航包含五个一级入口。
- [x] 详情页可以返回上级页面。
- [x] v6 原有路由仍可访问。

## AI 学习台

- [x] 展示当前目标和进度。
- [x] 展示今日建议。
- [x] 展示 AI 快捷指令。
- [x] 展示结构化行动卡片。
- [x] 行动卡片可跳转。
- [x] AI 失败时显示 fallback。
- [x] AI 分析结果页展示薄弱点、证据和行动。

## 学习

- [x] 学习页展示课程筛选。
- [x] 学习页展示目标、课程信息、任务。
- [x] 可手动创建任务。
- [x] 可完成任务。
- [x] 可生成 AI 任务草稿。
- [x] AI 任务草稿确认后才调用真实创建接口。
- [x] 学习任务详情页可打开。

## 作业

- [x] 作业页支持按课程视图。
- [x] 作业页支持日历视图。
- [x] 作业页支持截止时间视图。
- [x] 作业详情页展示要求、截止时间、状态。
- [x] 作业详情页展示 AI 拆解 fallback。
- [x] 提交页可编辑正文。
- [x] 提交页可填写附件说明。
- [x] 提交页可触发 AI 自检 fallback。
- [x] 提交预览页展示最终内容。
- [x] 提交成功页展示结果。
- [x] 提交失败保留草稿。
- [x] 作业历史页可打开。
- [x] 教师反馈页可打开。

## 练习与错题

- [x] 练习页展示题库入口。
- [x] 练习页展示 AI 推荐练习入口。
- [x] 练习页展示错题回放。
- [x] 练习页展示练习历史。
- [x] 练习答题页有答题卡。
- [x] 答题后进度更新。
- [x] 完成练习后进入结果页。
- [x] 结果页展示正确率和错题摘要。
- [x] 错题详情页展示题目、答案、解析。

## 课程笔记

- [x] 笔记页按课程组织。
- [x] 笔记编辑页可创建笔记。
- [x] 可调用 AI 总结。
- [x] AI 笔记整理结果页展示摘要。
- [x] AI 笔记整理结果页展示复习卡片。
- [x] AI 笔记整理结果页展示作业段落。
- [x] 保存整理结果时创建新笔记。

## AI Adapter

- [x] prompt 不散落在 views。
- [x] `StudentAiAdapter` 方法齐全。
- [x] AI 输出符合 schema。
- [x] AI 失败不会让页面白屏。
- [x] adapter 可在未来替换为真实 LangChain 后端接口。

## UI/UX

- [x] 390px 无横向溢出。
- [x] 768px 布局不重叠。
- [x] 1024px 三栏或折叠布局稳定。
- [x] 1440px 内容不过度拉伸。
- [x] 写操作有 saving 状态。
- [x] 失败状态可读。
- [x] 空状态可读。
- [x] focus ring 可见。

## 测试

- [x] `npm test` 通过。
- [x] `npm run test:services` 通过。
- [x] 新增 student selectors 测试。
- [x] 新增 StudentAiAdapter fallback 测试。
- [x] 新增 student views import 测试。
- [x] 普通测试不依赖 LM Studio。
