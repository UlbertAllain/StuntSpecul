ALTER TABLE examinations ADD COLUMN finalized_at INTEGER;

UPDATE examinations
SET finalized_at = completed_at
WHERE status = 'completed' AND completed_at IS NOT NULL;
