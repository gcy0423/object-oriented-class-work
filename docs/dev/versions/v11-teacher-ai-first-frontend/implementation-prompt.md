# Implementation Prompt

你要实现 v11 新版教师前端。请基于 `prototypes/teacher-ai-first` 原型和现有原生 ESM 项目结构开发，不引入 React/Vue/构建链。

核心目标：

> 界面要有呼吸感、稳定感、信息层级清楚，不能像元素被直接倒进页面里。

实现时必须持续检查：

- 间距。
- padding。
- 对齐。
- 稳定。
- 可读。
- 无内部字段。
- 无闪烁。

## 必须遵守

0. 必须以 `prototypes/teacher-ai-first` 作为教师端信息架构、页面层级、布局节奏和 AI 助手位置的基准。
1. 模块之间必须有明确间距。
2. 卡片内部必须有 padding。
3. 同类操作必须左对齐自然排布。
4. 不要露出内部 ID。
5. 侧栏必须稳定。
6. 首屏不能闪旧界面。
7. 页面内容要有层级。
8. 按钮和文字不能挤。
9. 布局要适配窄屏。
10. AI 上下文助手要随页面变化。

## 实现建议

- 先写 `teacherSelectors.js`，把数据模型理顺。
- 再写 `teacherShell.js` 和 `teacherRuntime.js`，保证首屏稳定。
- 然后逐页迁移教师页面。
- 最后做 CSS 收敛和窄屏验证。

## 禁止

- 禁止脱离 `prototypes/teacher-ai-first` 另起一套教师端体验。
- 禁止把旧工作台内容直接塞进新版 shell。
- 禁止用内部 ID 作为展示文本。
- 禁止让按钮组默认 `justify-content: space-between`。
- 禁止页面加载时先渲染旧布局再切新版。
- 禁止右侧 AI 助手在所有页面显示完全相同内容。
