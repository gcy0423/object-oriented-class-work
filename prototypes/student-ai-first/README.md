# 学生端 AI-first 产品原型

这个目录是 EduMind Agent 学生端交互重构的静态原型，不修改现有业务代码。

## 打开方式

直接用浏览器打开：

```text
D:\Project\mxdx\object-oriented-class-work\prototypes\student-ai-first\index.html
```

## 原型范围

- AI 学习台：学生默认入口，强调自然语言输入、快捷指令、AI 推荐路径和可确认操作。
- 目标与任务：保留手动管理入口，同时加入 AI 拆解目标和任务草稿确认；任务先归入固定类型。
- 作业详情：保留按课程和按日历两种传统入口；AI 解释作业要求、检查提交内容，但提交仍由学生手动确认。

## 交互原则

- AI-first，不是 AI-only。
- 手动入口一直可见。
- AI 输出不只是一段文本，还要给出结构化步骤和可执行操作。
- 学习任务固定为 5 类：预习/复习、文档产出、练习巩固、作业推进、笔记整理。
- 传统作业必须支持两种查找方式：按课程排序、按日历/截止时间排序。
- 创建任务、提交作业等写入动作必须由学生确认。
- 手机端采用底部导航和单列内容，不沿用桌面双栏。

## 验证

已用 Playwright 截图验证桌面与手机视口：

- `screenshots/desktop-desk.png`
- `screenshots/desktop-tasks.png`
- `screenshots/mobile-desk.png`
- `screenshots/mobile-assignment.png`

如需重新验证，运行：

```bat
C:\Users\31244\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe verify-prototype.mjs
```
