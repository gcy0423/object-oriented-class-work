# v6 范围

## 做什么

- 拆分 `client/src/app.js` 的页面渲染职责。
- 拆分 `client/src/components.js` 的大组件集合。
- 新增作业管理完整页。
- 新增题库管理页。
- 新增练习中心页。
- 扩展统计页。
- 新增设置页。
- 新增前端状态选择器和视图状态管理。
- 新增表单验证、查询参数构造、日期数字格式化等工具。
- 补齐 API client 中 v6 页面需要的读写方法。
- 补齐样式 token、表格、筛选器、答题卡、条形图、健康状态、设置页样式。
- 增加轻量前端结构测试，验证模块可导入、关键组件输出稳定、API path 正确。

## 不做什么

- 不新增 React/Vue 等框架。
- 不新增 npm 前端构建工具。
- 不新增图表库。
- 不引入 TypeScript。
- 不新增真实权限系统；继续使用 v5 已有角色判断。
- 不改现有 Gateway 静态托管方式。
- 不做真实模型密钥持久化；设置页只展示配置说明和健康状态。
- 不实现富文本、附件、批量导入、Excel 导出。

## 兼容要求

v6 不能破坏以下能力：

- 登录、退出、token 保存。
- `/api/dashboard` 页面聚合。
- 学习目标、任务、笔记。
- AI 问答和计划生成。
- 协作消息和 SSE 活动刷新。
- v4-v5 的 assignment、question-bank、practice、mistake、analytics API。
- `client/` 仍可由 Gateway 直接托管。

## UI/UX 约束

- 使用系统字体：`Segoe UI`, `Microsoft YaHei`, Arial, sans-serif。
- 主色保持沉稳教学工作台：深蓝、白底、青绿色辅助，不采用儿童化字体。
- 使用语义色 token：primary、surface、muted、line、success、warning、danger。
- 所有表单字段使用 `<label>` 包裹或 `for/id` 关联。
- 每个复杂页面至少有 loading、empty、error 三态。
- 表格提供排序或筛选入口；如果本版本不实现排序，必须保留清晰的字段筛选。
- 图表同时显示图形和值。
- 统计条、进度条、掌握度条必须有文本 label。

## 风险控制

- 页面拆分先保持 API 行为不变，再搬迁渲染逻辑。
- 每次迁移一个视图后运行基本 smoke test。
- 新增模块必须只从 `api.js` 请求 Gateway 相对路径。
- 写操作必须统一经过 `withSaving` 或等价状态处理，避免重复提交。
- 旧 `components.js` 可以作为过渡层，但 v6 完成时新增页面不得继续堆在该文件。

