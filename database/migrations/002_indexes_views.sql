-- @id: 002_indexes_views
-- @description: Query indexes and reporting views for learning progress, AI usage, and collaboration activity.
-- @scope: reporting

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_status ON users(role, status);
CREATE INDEX idx_role_bindings_user_scope ON role_bindings(user_id, scope_type, scope_id);
CREATE INDEX idx_courses_teacher ON courses(teacher_id);
CREATE INDEX idx_course_members_course ON course_members(course_id);
CREATE INDEX idx_course_members_user ON course_members(user_id);
CREATE INDEX idx_goals_owner_status ON learning_goals(owner_id, status);
CREATE INDEX idx_goals_course_target ON learning_goals(course_id, target_date);
CREATE INDEX idx_tasks_goal_status ON study_tasks(goal_id, status);
CREATE INDEX idx_tasks_owner_due ON study_tasks(owner_id, due_date);
CREATE INDEX idx_notes_owner_course ON learning_notes(owner_id, course_id);
CREATE INDEX idx_notes_course_updated ON learning_notes(course_id, updated_at);
CREATE INDEX idx_documents_course_status ON knowledge_documents(course_id, status);
CREATE INDEX idx_documents_owner_created ON knowledge_documents(owner_id, created_at);
CREATE INDEX idx_chunks_document_index ON knowledge_chunks(document_id, chunk_index);
CREATE INDEX idx_chunks_course_tokens ON knowledge_chunks(course_id, token_count);
CREATE INDEX idx_ai_conversations_owner ON ai_conversations(owner_id, updated_at);
CREATE INDEX idx_ai_conversations_course ON ai_conversations(course_id, updated_at);
CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id, created_at);
CREATE INDEX idx_ai_messages_provider ON ai_messages(provider, created_at);
CREATE INDEX idx_rooms_course ON collaboration_rooms(course_id);
CREATE INDEX idx_messages_room_created ON room_messages(room_id, created_at);
CREATE INDEX idx_messages_author_created ON room_messages(author_id, created_at);
CREATE INDEX idx_notifications_receiver_read ON notifications(receiver_id, read_at);
CREATE INDEX idx_activity_actor_created ON activity_logs(actor_id, created_at);
CREATE INDEX idx_activity_type_created ON activity_logs(type, created_at);
CREATE INDEX idx_audit_resource ON audit_events(resource_type, resource_id, created_at);
CREATE INDEX idx_audit_actor_action ON audit_events(actor_id, action, created_at);
CREATE INDEX idx_prompt_scenario_enabled ON prompt_templates(scenario, enabled);
CREATE INDEX idx_reports_owner_type ON reports(owner_id, report_type, generated_at);

CREATE VIEW v_learning_goal_progress AS
SELECT
  g.id AS goal_id,
  g.owner_id,
  g.course_id,
  g.title,
  g.status,
  g.progress,
  COUNT(t.id) AS task_count,
  SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done_count,
  SUM(CASE WHEN t.status <> 'done' AND t.due_date < CURRENT_DATE THEN 1 ELSE 0 END) AS overdue_count
FROM learning_goals g
LEFT JOIN study_tasks t ON t.goal_id = g.id
GROUP BY g.id, g.owner_id, g.course_id, g.title, g.status, g.progress;

CREATE VIEW v_course_activity_summary AS
SELECT
  c.id AS course_id,
  c.title AS course_title,
  COUNT(DISTINCT m.user_id) AS member_count,
  COUNT(DISTINCT g.id) AS goal_count,
  COUNT(DISTINCT n.id) AS note_count,
  COUNT(DISTINCT kd.id) AS knowledge_document_count
FROM courses c
LEFT JOIN course_members m ON m.course_id = c.id
LEFT JOIN learning_goals g ON g.course_id = c.id
LEFT JOIN learning_notes n ON n.course_id = c.id
LEFT JOIN knowledge_documents kd ON kd.course_id = c.id
GROUP BY c.id, c.title;

CREATE VIEW v_ai_usage_daily AS
SELECT
  DATE(created_at) AS usage_date,
  provider,
  COUNT(*) AS message_count,
  SUM(prompt_tokens) AS prompt_tokens,
  SUM(completion_tokens) AS completion_tokens,
  AVG(latency_ms) AS avg_latency_ms
FROM ai_messages
WHERE role = 'assistant'
GROUP BY DATE(created_at), provider;

CREATE VIEW v_user_workload AS
SELECT
  u.id AS user_id,
  u.name,
  u.role,
  COUNT(DISTINCT g.id) AS active_goal_count,
  COUNT(DISTINCT t.id) AS task_count,
  SUM(CASE WHEN t.status = 'done' THEN t.estimate_minutes ELSE 0 END) AS completed_minutes,
  COUNT(DISTINCT n.id) AS note_count
FROM users u
LEFT JOIN learning_goals g ON g.owner_id = u.id AND g.status = 'active'
LEFT JOIN study_tasks t ON t.owner_id = u.id
LEFT JOIN learning_notes n ON n.owner_id = u.id
GROUP BY u.id, u.name, u.role;

CREATE VIEW v_knowledge_search_source AS
SELECT
  kc.id AS chunk_id,
  kd.id AS document_id,
  kd.title AS document_title,
  kd.course_id,
  kc.heading,
  kc.keywords,
  kc.token_count,
  SUBSTR(kc.content, 1, 240) AS preview
FROM knowledge_chunks kc
JOIN knowledge_documents kd ON kd.id = kc.document_id
WHERE kd.status = 'indexed';
