export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function attr(value) {
  return escapeHtml(value);
}

export function readFormData(form) {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

export function readCheckedValues(form, name) {
  return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((item) => item.value);
}

export function buttonLabel(label, loadingLabel, isLoading) {
  return isLoading ? loadingLabel : label;
}

export function joinClass(...items) {
  return items.filter(Boolean).join(" ");
}
