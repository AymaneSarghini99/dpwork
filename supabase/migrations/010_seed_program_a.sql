-- Seed Program A (full week) for aymansarghini7@gmail.com
-- Program B: add later in app when ready

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'aymansarghini7@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: aymansarghini7@gmail.com';
  END IF;

  INSERT INTO user_training_settings (user_id, cycle_start_date)
  VALUES (v_user_id, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;

  DELETE FROM workout_exercises
  WHERE user_id = v_user_id AND program = 'A';

  DELETE FROM workout_plans
  WHERE user_id = v_user_id AND program = 'A';

  INSERT INTO workout_plans (day, program, workout, user_id)
  VALUES
    ('Monday', 'A', 'Push', v_user_id),
    ('Tuesday', 'A', 'Pull', v_user_id),
    ('Wednesday', 'A', 'Short Run', v_user_id),
    ('Thursday', 'A', 'Legs', v_user_id),
    ('Friday', 'A', 'Shoulders', v_user_id),
    ('Saturday', 'A', 'Long Run', v_user_id),
    ('Sunday', 'A', 'Swimming', v_user_id)
  ON CONFLICT (user_id, program, day) DO UPDATE
    SET workout = EXCLUDED.workout;

  INSERT INTO workout_exercises (day, program, exercise_name, sets, reps, focus, notes, user_id, created_at)
  VALUES
    ('Monday', 'A', 'Incline Press', '4 sets × 6–10', '', 'Chest', NULL, v_user_id, NOW()),
    ('Monday', 'A', 'Bench Press', '3–4 sets × 6–8', '', 'Chest', NULL, v_user_id, NOW() + INTERVAL '1 second'),
    ('Monday', 'A', 'Cable Chest Fly', '3 sets × 10–15', '', 'Chest', NULL, v_user_id, NOW() + INTERVAL '2 seconds'),
    ('Monday', 'A', 'Weighted Dips', '3 sets × 8–12', '', 'Chest', NULL, v_user_id, NOW() + INTERVAL '3 seconds'),
    ('Monday', 'A', 'Rope Pushdowns', '3 sets × 10–15', '', 'Triceps', NULL, v_user_id, NOW() + INTERVAL '4 seconds'),
    ('Monday', 'A', 'Overhead Cable Tricep Extension', '3 sets × 10–15', '', 'Triceps', NULL, v_user_id, NOW() + INTERVAL '5 seconds'),
    ('Monday', 'A', 'Push-ups', '2 sets to failure', '', 'Finisher', NULL, v_user_id, NOW() + INTERVAL '6 seconds'),
    ('Tuesday', 'A', 'Pull-Ups', '4 sets × 6–10', '', 'Back', NULL, v_user_id, NOW()),
    ('Tuesday', 'A', 'Barbell Rows', '4 sets × 8–12', '', 'Back', NULL, v_user_id, NOW() + INTERVAL '1 second'),
    ('Tuesday', 'A', 'Seated Cable Row', '3 sets × 8–12', '', 'Back', NULL, v_user_id, NOW() + INTERVAL '2 seconds'),
    ('Tuesday', 'A', 'Face Pulls', '3 sets × 12–15', '', 'Back', NULL, v_user_id, NOW() + INTERVAL '3 seconds'),
    ('Tuesday', 'A', 'Biceps Curls', '3 sets × 10–12', '', 'Biceps', NULL, v_user_id, NOW() + INTERVAL '4 seconds'),
    ('Tuesday', 'A', 'Hammer Curls', '3 sets × 10–12', '', 'Biceps', NULL, v_user_id, NOW() + INTERVAL '5 seconds'),
    ('Wednesday', 'A', 'Run', '4–8 km', '', 'Cardio', NULL, v_user_id, NOW()),
    ('Thursday', 'A', 'Squats', '4 sets × 6–10', '', 'Legs', NULL, v_user_id, NOW()),
    ('Thursday', 'A', 'Bulgarian Split Squats', '3 sets × 10–12', '', 'Legs', NULL, v_user_id, NOW() + INTERVAL '1 second'),
    ('Thursday', 'A', 'Leg Extensions', '2–3 sets to failure', '', 'Legs', NULL, v_user_id, NOW() + INTERVAL '2 seconds'),
    ('Thursday', 'A', 'Leg Curls', '3 sets × 10–15', '', 'Legs', NULL, v_user_id, NOW() + INTERVAL '3 seconds'),
    ('Thursday', 'A', 'Romanian Deadlifts (RDLs)', '4 sets × 8–12', '', 'Legs', NULL, v_user_id, NOW() + INTERVAL '4 seconds'),
    ('Thursday', 'A', 'Calf Raises', '4 sets × 12–20', '', 'Calves', NULL, v_user_id, NOW() + INTERVAL '5 seconds'),
    ('Thursday', 'A', 'Core', 'Exercises of choice', '', 'Core', NULL, v_user_id, NOW() + INTERVAL '6 seconds'),
    ('Friday', 'A', 'Overhead Press', '3–4 sets × 6–8', '', 'Shoulders', NULL, v_user_id, NOW()),
    ('Friday', 'A', 'Dumbbell Lateral Raises', '5 sets × 12–20', '', 'Shoulders', 'Most important for width', v_user_id, NOW() + INTERVAL '1 second'),
    ('Friday', 'A', 'Reverse Pec Deck', '3–4 sets × 12–15', '', 'Shoulders', NULL, v_user_id, NOW() + INTERVAL '2 seconds'),
    ('Friday', 'A', 'Face Pulls', '3 sets × 12–15', '', 'Shoulders', NULL, v_user_id, NOW() + INTERVAL '3 seconds'),
    ('Friday', 'A', 'Seated Biceps Curls', '3 sets × 10–12', '', 'Biceps', NULL, v_user_id, NOW() + INTERVAL '4 seconds'),
    ('Saturday', 'A', 'Run', '10–15 km', '', 'Cardio', NULL, v_user_id, NOW()),
    ('Sunday', 'A', 'Swimming', 'Recovery session', '', 'Cardio', NULL, v_user_id, NOW())
  ON CONFLICT (user_id, program, day, exercise_name) DO UPDATE
    SET sets = EXCLUDED.sets, focus = EXCLUDED.focus, notes = EXCLUDED.notes;

END $$;
