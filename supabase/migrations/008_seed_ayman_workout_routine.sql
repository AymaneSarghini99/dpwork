-- Seed workout plans + exercises for aymansarghini7@gmail.com
-- Day split: Mon Push | Tue Pull | Wed Shoulders | Thu Legs
-- Idempotent: safe to re-run (upserts on unique indexes from 006)

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'aymansarghini7@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: aymansarghini7@gmail.com — sign up first, then re-run this migration';
  END IF;

  -- Remove stale exercises (old names like "Incline Dumbbell Press" are not updated by upsert)
  DELETE FROM workout_exercises
  WHERE user_id = v_user_id
    AND day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday');

  -- Workout plans (one workout per weekday)
  INSERT INTO workout_plans (day, workout, user_id)
  VALUES
    ('Monday', 'Push', v_user_id),
    ('Tuesday', 'Pull', v_user_id),
    ('Wednesday', 'Shoulders', v_user_id),
    ('Thursday', 'Legs', v_user_id)
  ON CONFLICT (user_id, day) DO UPDATE
    SET workout = EXCLUDED.workout;

  -- Monday — Push
  INSERT INTO workout_exercises (day, exercise_name, sets, reps, focus, notes, user_id, created_at)
  VALUES
    ('Monday', 'Incline Press', '4 sets × 6–10', '', 'Chest', NULL, v_user_id, NOW() + INTERVAL '0 seconds'),
    ('Monday', 'Bench Press', '3–4 sets × 6–8', '', 'Chest', NULL, v_user_id, NOW() + INTERVAL '1 second'),
    ('Monday', 'Cable Chest Fly', '3 sets × 10–15', '', 'Chest', NULL, v_user_id, NOW() + INTERVAL '2 seconds'),
    ('Monday', 'Weighted Dips', '3 sets × 8–12', '', 'Chest', NULL, v_user_id, NOW() + INTERVAL '3 seconds'),
    ('Monday', 'Rope Pushdowns', '3 sets × 10–15', '', 'Triceps', NULL, v_user_id, NOW() + INTERVAL '4 seconds'),
    ('Monday', 'Overhead Cable Tricep Extension', '3 sets × 10–15', '', 'Triceps', NULL, v_user_id, NOW() + INTERVAL '5 seconds'),
    ('Monday', 'Push-ups', '2 sets to failure', '', 'Finisher', NULL, v_user_id, NOW() + INTERVAL '6 seconds')
  ON CONFLICT (user_id, day, exercise_name) DO UPDATE
    SET sets = EXCLUDED.sets, focus = EXCLUDED.focus, notes = EXCLUDED.notes;

  -- Tuesday — Pull
  INSERT INTO workout_exercises (day, exercise_name, sets, reps, focus, notes, user_id, created_at)
  VALUES
    ('Tuesday', 'Pull-Ups', '4 sets × 6–10', '', 'Back', NULL, v_user_id, NOW() + INTERVAL '0 seconds'),
    ('Tuesday', 'Barbell Rows', '4 sets × 8–12', '', 'Back', NULL, v_user_id, NOW() + INTERVAL '1 second'),
    ('Tuesday', 'Seated Cable Row', '3 sets × 8–12', '', 'Back', NULL, v_user_id, NOW() + INTERVAL '2 seconds'),
    ('Tuesday', 'Face Pulls', '3 sets × 12–15', '', 'Back', NULL, v_user_id, NOW() + INTERVAL '3 seconds'),
    ('Tuesday', 'Biceps Curls', '3 sets × 10–12', '', 'Biceps', NULL, v_user_id, NOW() + INTERVAL '4 seconds'),
    ('Tuesday', 'Hammer Curls', '3 sets × 10–12', '', 'Biceps', NULL, v_user_id, NOW() + INTERVAL '5 seconds')
  ON CONFLICT (user_id, day, exercise_name) DO UPDATE
    SET sets = EXCLUDED.sets, focus = EXCLUDED.focus, notes = EXCLUDED.notes;

  -- Wednesday — Shoulders
  INSERT INTO workout_exercises (day, exercise_name, sets, reps, focus, notes, user_id, created_at)
  VALUES
    ('Wednesday', 'Overhead Press', '3–4 sets × 6–8', '', 'Shoulders', NULL, v_user_id, NOW() + INTERVAL '0 seconds'),
    ('Wednesday', 'Dumbbell Lateral Raises', '5 sets × 12–20', '', 'Shoulders', 'Most important for width', v_user_id, NOW() + INTERVAL '1 second'),
    ('Wednesday', 'Reverse Pec Deck', '3–4 sets × 12–15', '', 'Shoulders', NULL, v_user_id, NOW() + INTERVAL '2 seconds'),
    ('Wednesday', 'Face Pulls', '3 sets × 12–15', '', 'Shoulders', NULL, v_user_id, NOW() + INTERVAL '3 seconds'),
    ('Wednesday', 'Seated Biceps Curls', '3 sets × 10–12', '', 'Biceps', NULL, v_user_id, NOW() + INTERVAL '4 seconds')
  ON CONFLICT (user_id, day, exercise_name) DO UPDATE
    SET sets = EXCLUDED.sets, focus = EXCLUDED.focus, notes = EXCLUDED.notes;

  -- Thursday — Legs
  INSERT INTO workout_exercises (day, exercise_name, sets, reps, focus, notes, user_id, created_at)
  VALUES
    ('Thursday', 'Squats', '4 sets × 6–10', '', 'Legs', NULL, v_user_id, NOW() + INTERVAL '0 seconds'),
    ('Thursday', 'Bulgarian Split Squats', '3 sets × 10–12', '', 'Legs', NULL, v_user_id, NOW() + INTERVAL '1 second'),
    ('Thursday', 'Leg Extensions', '2–3 sets to failure', '', 'Legs', NULL, v_user_id, NOW() + INTERVAL '2 seconds'),
    ('Thursday', 'Leg Curls', '3 sets × 10–15', '', 'Legs', NULL, v_user_id, NOW() + INTERVAL '3 seconds'),
    ('Thursday', 'Romanian Deadlifts (RDLs)', '4 sets × 8–12', '', 'Legs', NULL, v_user_id, NOW() + INTERVAL '4 seconds'),
    ('Thursday', 'Calf Raises', '4 sets × 12–20', '', 'Calves', NULL, v_user_id, NOW() + INTERVAL '5 seconds')
  ON CONFLICT (user_id, day, exercise_name) DO UPDATE
    SET sets = EXCLUDED.sets, focus = EXCLUDED.focus, notes = EXCLUDED.notes;

END $$;
