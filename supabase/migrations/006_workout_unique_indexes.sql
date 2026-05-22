-- Database stays EMPTY until you add workouts in the app.
-- No INSERTs here — only indexes so the app can save/edit/delete safely.
--
-- workout_plans: you add day + workout name in the app
-- workout_exercises: you add exercises in the popup (eye icon)
-- All changes in the app sync to Supabase automatically when logged in

CREATE UNIQUE INDEX IF NOT EXISTS workout_plans_user_id_day_key
  ON workout_plans (user_id, day);

CREATE UNIQUE INDEX IF NOT EXISTS workout_exercises_user_day_exercise_key
  ON workout_exercises (user_id, day, exercise_name);
