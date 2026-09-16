CREATE TABLE IF NOT EXISTS examination_workflow (
  exam_id TEXT PRIMARY KEY NOT NULL,
  finalized_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (exam_id) REFERENCES examinations(id) ON DELETE CASCADE
);
