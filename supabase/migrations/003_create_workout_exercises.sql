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

-- Create RLS policies (drop first so this script is safe to re-run)
DROP POLICY IF EXISTS "Users can view their own workout exercises" ON workout_exercises;
DROP POLICY IF EXISTS "Users can insert their own workout exercises" ON workout_exercises;
DROP POLICY IF EXISTS "Users can update their own workout exercises" ON workout_exercises;
DROP POLICY IF EXISTS "Users can delete their own workout exercises" ON workout_exercises;

CREATE POLICY "Users can view their own workout exercises" ON workout_exercises
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout exercises" ON workout_exercises
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout exercises" ON workout_exercises
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout exercises" ON workout_exercises
  FOR DELETE USING (auth.uid() = user_id);

-- No seed data. Add workouts in the app or your own SQL.
