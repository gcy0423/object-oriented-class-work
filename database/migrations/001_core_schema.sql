-- @id: 001_core_schema
-- @description: EduMind Agent core relational schema for auth, learning, AI, collaboration, and audit domains.
-- @scope: schema

CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(160) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  role VARCHAR(32) NOT NULL,
  avatar VARCHAR(16),
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE role_bindings (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  role VARCHAR(32) NOT NULL,
  scope_type VARCHAR(32) NOT NULL DEFAULT 'global',
  scope_id VARCHAR(64),
  created_by VARCHAR(64),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE courses (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  teacher_id VARCHAR(64) NOT NULL,
  description TEXT,
  tags TEXT,
  visibility VARCHAR(32) NOT NULL DEFAULT 'class',
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (teacher_id) REFERENCES users(id)
);

CREATE TABLE course_members (
  id VARCHAR(64) PRIMARY KEY,
  course_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  member_role VARCHAR(32) NOT NULL DEFAULT 'student',
  joined_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE learning_goals (
  id VARCHAR(64) PRIMARY KEY,
  owner_id VARCHAR(64) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  title VARCHAR(200) NOT NULL,
  target_date DATE,
  priority VARCHAR(32) NOT NULL DEFAULT 'medium',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  progress INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE study_tasks (
  id VARCHAR(64) PRIMARY KEY,
  goal_id VARCHAR(64) NOT NULL,
  owner_id VARCHAR(64) NOT NULL,
  title VARCHAR(240) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'todo',
  estimate_minutes INTEGER NOT NULL DEFAULT 60,
  due_date DATE,
  dependency_task_id VARCHAR(64),
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (goal_id) REFERENCES learning_goals(id),
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (dependency_task_id) REFERENCES study_tasks(id)
);

CREATE TABLE learning_notes (
  id VARCHAR(64) PRIMARY KEY,
  owner_id VARCHAR(64) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  tags TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE knowledge_documents (
  id VARCHAR(64) PRIMARY KEY,
  course_id VARCHAR(64),
  owner_id VARCHAR(64) NOT NULL,
  title VARCHAR(240) NOT NULL,
  source_type VARCHAR(32) NOT NULL DEFAULT 'manual',
  source_uri VARCHAR(400),
  checksum VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'indexed',
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE knowledge_chunks (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) NOT NULL,
  course_id VARCHAR(64),
  chunk_index INTEGER NOT NULL,
  heading VARCHAR(240),
  content TEXT NOT NULL,
  keywords TEXT,
  token_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (document_id) REFERENCES knowledge_documents(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE ai_conversations (
  id VARCHAR(64) PRIMARY KEY,
  owner_id VARCHAR(64) NOT NULL,
  course_id VARCHAR(64),
  title VARCHAR(240) NOT NULL,
  provider VARCHAR(120) NOT NULL,
  model VARCHAR(160) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE ai_messages (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL,
  role VARCHAR(32) NOT NULL,
  content TEXT NOT NULL,
  provider VARCHAR(120),
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id)
);

CREATE TABLE collaboration_rooms (
  id VARCHAR(64) PRIMARY KEY,
  course_id VARCHAR(64),
  title VARCHAR(160) NOT NULL,
  room_type VARCHAR(32) NOT NULL DEFAULT 'course',
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE room_messages (
  id VARCHAR(64) PRIMARY KEY,
  room_id VARCHAR(64) NOT NULL,
  author_id VARCHAR(64) NOT NULL,
  content TEXT NOT NULL,
  reply_to_id VARCHAR(64),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (room_id) REFERENCES collaboration_rooms(id),
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (reply_to_id) REFERENCES room_messages(id)
);

CREATE TABLE notifications (
  id VARCHAR(64) PRIMARY KEY,
  receiver_id VARCHAR(64) NOT NULL,
  type VARCHAR(64) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (receiver_id) REFERENCES users(id)
);

CREATE TABLE activity_logs (
  id VARCHAR(64) PRIMARY KEY,
  actor_id VARCHAR(64) NOT NULL,
  type VARCHAR(80) NOT NULL,
  summary VARCHAR(400) NOT NULL,
  payload TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE audit_events (
  id VARCHAR(64) PRIMARY KEY,
  actor_id VARCHAR(64),
  action VARCHAR(120) NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  resource_id VARCHAR(80),
  ip_address VARCHAR(80),
  user_agent VARCHAR(400),
  result VARCHAR(32) NOT NULL DEFAULT 'success',
  details TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE prompt_templates (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  scenario VARCHAR(80) NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE reports (
  id VARCHAR(64) PRIMARY KEY,
  owner_id VARCHAR(64) NOT NULL,
  report_type VARCHAR(64) NOT NULL,
  title VARCHAR(200) NOT NULL,
  payload TEXT NOT NULL,
  generated_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
