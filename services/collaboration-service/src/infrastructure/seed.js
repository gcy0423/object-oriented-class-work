export function createCollaborationSeed(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return {
    rooms: [
      {
        id: "room_ood",
        title: "面向对象课程协作区",
        courseId: "course_ood",
        createdAt: today,
        updatedAt: today
      }
    ],
    messages: [
      {
        id: "msg_welcome",
        roomId: "room_ood",
        authorId: "user_teacher",
        content: "本周重点完成需求分析和领域模型草图。",
        createdAt: today,
        updatedAt: today
      }
    ],
    activityLogs: [],
    events: []
  };
}
