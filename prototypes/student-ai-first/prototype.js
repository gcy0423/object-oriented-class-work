const viewButtons = document.querySelectorAll("[data-view]");
const views = {
  desk: document.getElementById("view-desk"),
  tasks: document.getElementById("view-tasks"),
  assignment: document.getElementById("view-assignment")
};
const toast = document.getElementById("toast");
const promptBox = document.getElementById("aiPrompt");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function setView(name) {
  if (!views[name]) {
    return;
  }
  Object.entries(views).forEach(([key, element]) => {
    element.classList.toggle("active", key === name);
  });
  viewButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === name);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.view) {
      setView(button.dataset.view);
    }
  });
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    promptBox.value = button.dataset.prompt;
    showToast("已放入 AI 输入框。");
  });
});

document.getElementById("runAi").addEventListener("click", () => {
  showToast("AI 已根据当前课程、目标和待办生成建议。");
});

document.getElementById("confirmTasks").addEventListener("click", () => {
  showToast("已生成 3 条任务草稿，等待你确认写入。");
  setView("tasks");
});
