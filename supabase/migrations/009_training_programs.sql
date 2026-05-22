-- Multi-program support: Program A (weeks 1–2) and Program B (week 3)

ALTER TABLE workout_plans
  ADD COLUMN IF NOT EXISTS program TEXT NOT NULL DEFAULT 'A'
  CHECK (program IN ('A', 'B'));

ALTER TABLE workout_exercises
  ADD COLUMN IF NOT EXISTS program TEXT NOT NULL DEFAULT 'A'
  CHECK (program IN ('A', 'B'));

UPDATE workout_plans SET program = 'A' WHERE program IS NULL;
UPDATE workout_exercises SET program = 'A' WHERE program IS NULL;

DROP INDEX IF EXISTS workout_plans_user_id_day_key;
DROP INDEX IF EXISTS workout_exercises_user_day_exercise_key;

CREATE UNIQUE INDEX IF NOT EXISTS workout_plans_user_program_day_key
  ON workout_plans (user_id, program, day);

CREATE UNIQUE INDEX IF NOT EXISTS workout_exercises_user_program_day_exercise_key
  ON workout_exercises (user_id, program, day, exercise_name);

-- Cycle settings (3-week: weeks 1–2 = A, week 3 = B)
CREATE TABLE IF NOT EXISTS user_training_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  program_override TEXT CHECK (program_override IS NULL OR program_override IN ('A', 'B')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_training_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own training settings" ON user_training_settings;
DROP POLICY IF EXISTS "Users can insert own training settings" ON user_training_settings;
DROP POLICY IF EXISTS "Users can update own training settings" ON user_training_settings;

CREATE POLICY "Users can view own training settings" ON user_training_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training settings" ON user_training_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training settings" ON user_training_settings
  FOR UPDATE USING (auth.uid() = user_id);
