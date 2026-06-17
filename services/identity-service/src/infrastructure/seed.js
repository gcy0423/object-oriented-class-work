export function createIdentitySeed(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return {
    users: [
      {
        id: "user_student",
        name: "林知夏",
        role: "student",
        email: "student@edumind.local",
        avatar: "夏",
        createdAt: today,
        updatedAt: today
      },
      {
        id: "user_teacher",
        name: "周老师",
        role: "teacher",
        email: "teacher@edumind.local",
        avatar: "周",
        createdAt: today,
        updatedAt: today
      }
    ],
    sessions: []
  };
}
