# Test Plan

## 自动测试

```bash
npm test
npm run test:services
```

## 前端模块测试

- 新增或更新 client test，覆盖教师路由和 selector。
- 确认 `teacherRuntime` 可以在无构建环境中 import。
- 确认教师默认路由不会落回旧 `dashboard`。
- 确认教师 AI 助手根据不同 route 输出不同摘要。

## 浏览器验证

桌面视口：

- 1440 x 900
- 1280 x 800

窄屏视口：

- 390 x 844
- 768 x 1024

验证项：

- section 间距稳定。
- 卡片内部有 padding。
- 按钮组左对齐并有 gap。
- 侧栏顶部和底部用户卡稳定。
- 页面无横向滚动。
- 不出现内部 ID。
- 首屏不闪旧界面。
- AI 助手内容随页面变化。

## 手工工作流

- 教师登录。
- 进入教师首页。
- 切换课程学情。
- 打开学生画像。
- 查看学生 AI results/timeline。
- 打开作业批改。
- 查看提交 AI evidence。
- 发送干预提醒。
- 切换到窄屏验证布局。

