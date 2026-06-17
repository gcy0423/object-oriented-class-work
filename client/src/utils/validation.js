function clean(value) {
  return String(value ?? "").trim();
}

export function required(value, message) {
  return clean(value) ? "" : message;
}

export function minNumber(value, min, message) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min ? "" : message;
}

export function compactErrors(errors = {}) {
  return Object.fromEntries(Object.entries(errors).filter(([, value]) => value));
}

export function validateAssignment(input) {
  return compactErrors({
    title: required(input.title, "请输入作业标题。"),
    courseId: required(input.courseId, "请选择课程。"),
    dueAt: required(input.dueAt, "请选择截止日期。"),
    rubricId: required(input.rubricId, "请选择评分规则。")
  });
}

export function validateQuestionBank(input) {
  return compactErrors({
    title: required(input.title, "请输入题库标题。"),
    courseId: required(input.courseId, "请选择课程。")
  });
}

export function validateQuestion(input) {
  return compactErrors({
    bankId: required(input.bankId, "请选择题库。"),
    courseId: required(input.courseId, "请选择课程。"),
    type: required(input.type, "请选择题型。"),
    stem: required(input.stem, "请输入题干。"),
    answer: required(input.answer, "请输入参考答案。"),
    analysis: required(input.analysis, "请输入答案解析。")
  });
}

export function validateGrade(input) {
  return compactErrors({
    score: minNumber(input.score, 0, "请输入有效分数。"),
    feedback: required(input.feedback, "请输入评分反馈。")
  });
}

export function validateProfile(input) {
  return compactErrors({
    name: required(input.name, "请输入姓名。"),
    email: required(input.email, "请输入邮箱。")
  });
}
