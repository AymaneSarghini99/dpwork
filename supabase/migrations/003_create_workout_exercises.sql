-- Create workout_exercises table
CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  exercise_name TEXT NOT NULL,
  sets TEXT NOT NULL,
  reps TEXT NOT NULL,
  focus TEXT,
  notes TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workout_exercises_user_id ON workout_exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_day ON workout_exercises(day);

-- Enable RLS (Row Level Security)
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own workout exercises" ON workout_exercises
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout exercises" ON workout_exercises
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout exercises" ON workout_exercises
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout exercises" ON workout_exercises
  FOR DELETE USING (auth.uid() = user_id);

-- Insert default workout exercises for Monday (PUSH day)
INSERT INTO workout_exercises (day, exercise_name, sets, reps, focus, notes, user_id) VALUES
  ('Monday', 'Bench Press', '4 sets × 6–10 reps', 'Focus: chest, shoulders, triceps', NULL, auth.uid()),
  ('Monday', 'Incline Dumbbell Press', '3 sets × 8–12 reps', 'Slow controlled movement', NULL, auth.uid()),
  ('Monday', 'Shoulder Press', '3 sets × 8–12 reps', 'Keep core tight', NULL, auth.uid()),
  ('Monday', 'Lateral Raises', '3 sets × 12–15 reps', 'Controlled movement', NULL, auth.uid()),
  ('Monday', 'Tricep Pushdowns', '3 sets × 10–15 reps', NULL, NULL, auth.uid()),
  ('Monday', 'Push-Ups (Finish)', '2 sets to failure', 'Rest: Heavy exercises 90 sec, Isolation exercises 45–60 sec', auth.uid())
ON CONFLICT (day, exercise_name, user_id) DO NOTHING;
