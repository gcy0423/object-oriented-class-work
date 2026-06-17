# v6 测试计划

## 命令

```bash
npm run test:services
npm test
```

可选手工启动：

```bash
npm run start:services:mock
```

访问：

```text
http://127.0.0.1:4077/
```

## 自动化测试范围

### 前端轻量测试

- `client/src/utils/format.js` 日期、数字、百分比格式化。
- `client/src/utils/query.js` 查询参数构造。
- `client/src/utils/validation.js` 必填、数字范围、日期校验。
- `client/src/state/selectors.js` 角色权限、ViewModel 派生。
- `client/src/api.js` v6 新增方法请求 path 和 method。
- `client/src/views/*` 模块可导入，不依赖浏览器构建链。

### assessment-service 测试

如果 v6 新增 CRUD API，需要覆盖：

- 创建题库。
- 更新题库。
- 删除题库。
- 创建题目。
- 更新题目。
- 删除题目。
- 更新作业。
- 删除无提交作业。
- 拒绝删除已有提交作业。
- 学生不能访问教师 CRUD。

### Gateway 测试

- 代理 assignment update/delete。
- 代理 question-bank CRUD。
- 代理 question CRUD。
- 代理 practice history。
- `/api/health` 可供设置页读取。

## 手工验证

### 作业管理页

- 教师可发布作业。
- 教师可编辑作业。
- 教师可按课程、状态、关键字筛选。
- 教师可打开提交列表。
- 教师可人工评分。
- 教师可触发 AI 初评并看到结果。
- 学生只能查看和提交自己的作业。

### 题库管理页

- 教师可创建题库。
- 教师可编辑题库。
- 教师可新增单选、多选、简答、代码阅读题。
- 教师可维护答案解析。
- 删除前有确认。
- 学生看不到题库管理入口。

### 练习页

- 学生可从题库开始练习。
- 答题卡显示已答、未答、正确、错误状态。
- 进度条和数量同步更新。
- 完成练习后显示正确率。
- 错题回放能显示原题、我的答案、正确答案、解析。
- 练习历史可查看。

### 统计页

- 教师可查看课程统计。
- 教师可查看学生画像。
- 作业完成率条形图显示文本值。
- 掌握度条形图显示文本值。
- 风险学生有原因标签。

### 设置页

- 显示当前用户资料。
- 显示模型 provider 和配置说明。
- 显示 identity、learning、assessment、ai、collaboration、analytics 健康状态。
- 健康刷新失败时页面不白屏。

## UI 回归

- 375px：导航可用，表格不撑出屏幕。
- 768px：双列布局合理降级。
- 1024px：侧栏和主内容不重叠。
- 1440px：内容宽度不过度拉长。
- 键盘 Tab 顺序符合视觉顺序。
- 所有 icon-only 按钮有 `aria-label`。
- 表单错误显示在字段附近。
- loading 超过 300ms 有反馈。

