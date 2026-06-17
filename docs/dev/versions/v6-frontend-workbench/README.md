# v6-frontend-workbench

v6 在 v5 已完成 analytics-service、assessment 接入和基础教师统计页的基础上，聚焦前端工作台扩展。目标不是新增后端大能力，而是把 `client/` 从“集中式演示页面”升级为可维护、可继续加页面的原生 ESM 工作台。

本版本仍保持无构建链：不引入 React、Vue、Vite、Webpack、Tailwind 编译步骤或图表库。所有页面、表单、状态和组件继续使用浏览器原生 HTML、CSS、ESM，实现上通过目录拆分增加代码量和可读性。

## 版本目标

- 作业管理完整页：教师发布、编辑、筛选、评分、AI 初评结果查看。
- 题库管理页：题库 CRUD、题目 CRUD、题型表单、答案解析维护。
- 练习页：答题卡、练习进度、错题回放、练习历史。
- 统计页：课程统计、学生画像、作业完成率、掌握度条形图。
- 设置页：模型配置说明、服务健康面板、用户资料。
- 前端拆分为 `views/`、`forms/`、`widgets/`、`state/`、`utils/`。
- 补齐 loading、empty、error、saving、disabled、dirty form、toast 等交互状态。
- 按 `ui-ux-pro-max` 的数据密集型 Dashboard 方向统一布局、色彩、表单、图表和响应式规则。

## 本版本不做

- 不新增大型后端服务。
- 不引入前端框架和构建工具。
- 不接入复杂图表库，条形图、进度图、迷你统计图用 HTML/CSS 实现。
- 不实现真实文件导入导出。
- 不实现富文本编辑器。
- 不改数据库形态，继续使用现有 JSON 数据和服务 API。
- 不删除 v0-v5 文档和旧单体代码。

## 目标文件结构

```text
client/
  index.html
  styles.css
  src/
    app.js
    api.js
    components.js
    store.js
    state/
      appState.js
      selectors.js
      viewState.js
    utils/
      dom.js
      format.js
      validation.js
      query.js
    widgets/
      cards.js
      charts.js
      filters.js
      health.js
      layout.js
      tables.js
      toast.js
    forms/
      assignmentForm.js
      gradingForm.js
      questionBankForm.js
      questionForm.js
      profileForm.js
      modelConfigPanel.js
    views/
      dashboardView.js
      assignmentManageView.js
      questionBankManageView.js
      practiceView.js
      analyticsView.js
      settingsView.js
      learningView.js
      aiView.js
      teamView.js
```

## 目标导航

| 路由 | 用户 | 页面 |
| --- | --- | --- |
| `dashboard` | 全部 | 学习总览 |
| `learning` | 全部 | 目标与任务 |
| `assignments` | 学生、教师、管理员 | 作业中心；教师看到管理能力 |
| `question-banks` | 教师、管理员 | 题库管理 |
| `practice` | 学生、教师、管理员 | 练习、答题卡、错题回放、历史 |
| `analytics` | 教师、管理员 | 统计与学生画像 |
| `ai` | 全部 | AI 学习教练 |
| `team` | 全部 | 协作区 |
| `settings` | 全部 | 用户资料、模型说明、健康面板 |

## UI 设计原则

v6 使用数据密集型工作台风格：

- 以表格、筛选器、数字卡、条形图、状态徽标为主。
- 页面不做营销式 hero，不使用大面积装饰渐变。
- 卡片半径保持 8px 或以下。
- 表单必须有可见 label、helper text、字段级错误。
- 所有按钮和可点区域最小高度 44px。
- 统计图必须显示数值文本，不能只靠颜色表达。
- 宽表格移动端使用卡片化列表或横向容器，不能撑出视口。
- 加载超过 300ms 时显示骨架或按钮 loading。
- 保存、评分、AI 初评等写操作必须禁用重复提交。

## 目标启动命令

```bash
npm run start:services:mock
npm run test:services
npm test
```

浏览器访问：

```text
http://127.0.0.1:4077/
```

## 版本完成标准

- `client/src/app.js` 不再承担所有页面渲染，只负责启动、路由、事件分发和应用装配。
- `client/src/views/*` 覆盖作业管理、题库管理、练习、统计、设置。
- `client/src/forms/*` 覆盖作业、评分、题库、题目、用户资料和模型配置说明。
- `client/src/widgets/*` 提供表格、筛选器、条形图、健康面板、布局部件等复用组件。
- 作业管理页支持筛选、详情、发布、编辑、评分、AI 初评结果查看。
- 题库管理页支持题库和题目 CRUD 表单。
- 练习页支持答题卡、进度、错题回放、练习历史。
- 统计页支持课程统计、学生画像、作业完成率、掌握度条形图。
- 设置页展示当前用户、模型配置说明、Gateway 服务健康状态。
- 窄屏和桌面布局均无重叠、无横向溢出。
- `npm run test:services` 和 `npm test` 通过。

