const appShell = document.getElementById("appShell");
const toast = document.getElementById("toast");
const viewButtons = document.querySelectorAll("[data-view]");
const views = {
  aiDesk: document.getElementById("view-aiDesk"),
  aiInsight: document.getElementById("view-aiInsight"),
  learn: document.getElementById("view-learn"),
  learningTaskDetail: document.getElementById("view-learningTaskDetail"),
  assignments: document.getElementById("view-assignments"),
  assignmentDetail: document.getElementById("view-assignmentDetail"),
  assignmentSubmit: document.getElementById("view-assignmentSubmit"),
  assignmentHistory: document.getElementById("view-assignmentHistory"),
  assignmentFeedback: document.getElementById("view-assignmentFeedback"),
  assignmentPreview: document.getElementById("view-assignmentPreview"),
  submitSuccess: document.getElementById("view-submitSuccess"),
  practice: document.getElementById("view-practice"),
  practiceSession: document.getElementById("view-practiceSession"),
  practiceResult: document.getElementById("view-practiceResult"),
  wrongQuestionDetail: document.getElementById("view-wrongQuestionDetail"),
  notes: document.getElementById("view-notes"),
  noteEditor: document.getElementById("view-noteEditor"),
  noteAiResult: document.getElementById("view-noteAiResult")
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function setView(name) {
  if (!views[name]) return;
  Object.entries(views).forEach(([key, view]) => {
    view.classList.toggle("active", key === name);
  });
  viewButtons.forEach((button) => {
    const target = button.dataset.view;
    const active =
      target === name ||
      (target === "aiDesk" && name === "aiInsight") ||
      (target === "learn" && name === "learningTaskDetail") ||
      (target === "assignments" &&
        ["assignmentDetail", "assignmentSubmit", "assignmentHistory", "assignmentFeedback", "assignmentPreview", "submitSuccess"].includes(name)) ||
      (target === "practice" && ["practiceSession", "practiceResult", "wrongQuestionDetail"].includes(name)) ||
      (target === "notes" && ["noteEditor", "noteAiResult"].includes(name));
    button.classList.toggle("active", active);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

window.setView = setView;

document.getElementById("toggleRail").addEventListener("click", () => {
  appShell.classList.toggle("rail-collapsed");
  showToast(appShell.classList.contains("rail-collapsed") ? "侧栏已收起。" : "侧栏已展开。");
});

viewButtons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.mode;
    document.querySelectorAll("[data-mode]").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelectorAll(".assignment-mode").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `mode-${mode}`);
    });
  });
});

document.getElementById("generatePlan")?.addEventListener("click", () => {
  showToast("AI 已生成今日学习路径，并保留为待确认草稿。");
});

document.getElementById("openDraftDetail")?.addEventListener("click", () => {
  showToast("已打开草稿二级菜单，可确认加入或继续编辑。");
});
