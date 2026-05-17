-- Add per-day count (click calendar to increment: 1, 2, 3, …)
ALTER TABLE smoking_days
  ADD COLUMN IF NOT EXISTS count INTEGER NOT NULL DEFAULT 1 CHECK (count >= 1);
