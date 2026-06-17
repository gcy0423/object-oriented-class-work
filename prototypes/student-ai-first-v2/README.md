# 学生端 AI-first 产品原型 V2

这是根据手绘草图更新的第二版原型，保留第一版不覆盖。

## 打开方式

```text
D:\Project\mxdx\object-oriented-class-work\prototypes\student-ai-first-v2\index.html
```

## 设计方向

- 桌面端采用多面板学习工作台：左侧导航、中间主工作区、右侧 AI 上下文助手。
- 左侧导航支持展开/收起，收起后保留图标入口。
- 左侧导航只放一级入口：AI 学习台、学习、作业、练习与错题、课程笔记；作业详情和提交页不出现在侧栏。
- AI 学习台保留为软件主入口，负责规划、问答、总结、调起工具。
- 学习页结构：当前目标和进度、选择学习课程、课程信息展示、当前课程所属任务。
- 学习页右侧是任务规划区域：手动新建、AI 新建、类型选择、生成草稿、草稿二级菜单。
- 作业页支持三种排序：按课程、按日历表状、按截止时间列表。
- 作业详情采用主内容 + 右侧 AI 辅助栏：左侧展示作业要求和操作入口，右侧 AI 自动拆分和作业指导对话。
- 提交页是第三级界面：左侧提交内容/附件/提交/保存草稿，右侧 AI 自动检查、AI 评分评语和修改建议对话。
- 练习与错题页：练习入口、错题回放、练习历史、AI 薄弱点分析和生成练习。
- 课程笔记页：课程筛选、笔记列表、笔记内容、AI 整理建议和笔记对话。
- 手机端独立适配：隐藏桌面侧栏，使用顶部栏、底部导航和单列内容。

## 交互逻辑文档

完整页面层级、交互原则和主要流程见：

```text
INTERACTION_DESIGN.md
```

## 产品原则

- AI-first，但不是 AI-only。
- 手动入口一直存在，AI 负责建议、拆解和检查。
- 任务必须归入固定类型：预习/复习、文档产出、练习巩固、作业推进、笔记整理。
- 作业必须支持按课程、按日历表状、按截止时间列表三种传统查找方式。
- 写入、提交、发布等关键动作必须由学生确认。

## 验证截图

- `screenshots/desktop-ai.png`
- `screenshots/desktop-collapsed.png`
- `screenshots/desktop-learn.png`
- `screenshots/desktop-assignments.png`
- `screenshots/desktop-assignments-calendar.png`
- `screenshots/desktop-assignments-deadline.png`
- `screenshots/desktop-detail.png`
- `screenshots/desktop-submit.png`
- `screenshots/desktop-practice.png`
- `screenshots/desktop-notes.png`
- `screenshots/mobile-ai.png`
- `screenshots/mobile-learn.png`
- `screenshots/mobile-assignments.png`
- `screenshots/mobile-detail.png`
- `screenshots/mobile-submit.png`
- `screenshots/mobile-practice.png`
- `screenshots/mobile-notes.png`
