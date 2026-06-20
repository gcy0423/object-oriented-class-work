const appShell = document.getElementById("appShell");
const toast = document.getElementById("toast");
const viewButtons = document.querySelectorAll("[data-view]");
const views = {
  aiDesk: document.getElementById("view-aiDesk"),
  aiPlanDetail: document.getElementById("view-aiPlanDetail"),
  assignments: document.getElementById("view-assignments"),
  assignmentDraft: document.getElementById("view-assignmentDraft"),
  assignmentPublish: document.getElementById("view-assignmentPublish"),
  assignmentStudentPreview: document.getElementById("view-assignmentStudentPreview"),
  publishSuccess: document.getElementById("view-publishSuccess"),
  assignmentDetail: document.getElementById("view-assignmentDetail"),
  grading: document.getElementById("view-grading"),
  batchGradingResult: document.getElementById("view-batchGradingResult"),
  gradingDetail: document.getElementById("view-gradingDetail"),
  feedbackPublish: document.getElementById("view-feedbackPublish"),
  questionBank: document.getElementById("view-questionBank"),
  questionDetail: document.getElementById("view-questionDetail"),
  questionDraft: document.getElementById("view-questionDraft"),
  analytics: document.getElementById("view-analytics"),
  studentProfile: document.getElementById("view-studentProfile"),
  interventionConfirm: document.getElementById("view-interventionConfirm"),
  collaborationDetail: document.getElementById("view-collaborationDetail"),
  collaboration: document.getElementById("view-collaboration")
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

window.setView = function setView(name) {
  if (!views[name]) return;
  Object.entries(views).forEach(([key, view]) => {
    view.classList.toggle("active", key === name);
  });
  viewButtons.forEach((button) => {
    const target = button.dataset.view;
    const active =
      target === name ||
      (target === "aiDesk" && name === "aiPlanDetail") ||
      (target === "assignments" &&
        ["assignmentDraft", "assignmentPublish", "assignmentStudentPreview", "publishSuccess", "assignmentDetail"].includes(name)) ||
      (target === "grading" && ["batchGradingResult", "gradingDetail", "feedbackPublish"].includes(name)) ||
      (target === "questionBank" && ["questionDetail", "questionDraft"].includes(name)) ||
      (target === "analytics" && ["studentProfile", "interventionConfirm"].includes(name)) ||
      (target === "collaboration" && name === "collaborationDetail");
    button.classList.toggle("active", active);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
};

document.getElementById("toggleRail").addEventListener("click", () => {
  appShell.classList.toggle("rail-collapsed");
  showToast(appShell.classList.contains("rail-collapsed") ? "侧栏已收起。" : "侧栏已展开。");
});

viewButtons.forEach((button) => {
  button.addEventListener("click", () => window.setView(button.dataset.view));
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

document.getElementById("runAi")?.addEventListener("click", () => {
  window.setView("aiPlanDetail");
  showToast("AI 已生成今日教学处理顺序。");
});
