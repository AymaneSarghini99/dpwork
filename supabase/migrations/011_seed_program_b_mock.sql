-- Optional: seed Program B (CrossFit / longevity mock) for aymansarghini7@gmail.com
-- Run after 009. Replace with your AI-designed program when ready.

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

  DELETE FROM workout_exercises
  WHERE user_id = v_user_id AND program = 'B';

  DELETE FROM workout_plans
  WHERE user_id = v_user_id AND program = 'B';

  INSERT INTO workout_plans (day, program, workout, user_id)
  VALUES
    ('Monday', 'B', 'Strength + Engine', v_user_id),
    ('Tuesday', 'B', 'Aerobic Base', v_user_id),
    ('Wednesday', 'B', 'Metcon', v_user_id),
    ('Thursday', 'B', 'Mobility', v_user_id),
    ('Friday', 'B', 'Power + Pull', v_user_id),
    ('Saturday', 'B', 'Longevity', v_user_id),
    ('Sunday', 'B', 'Recovery', v_user_id)
  ON CONFLICT (user_id, program, day) DO UPDATE
    SET workout = EXCLUDED.workout;

  INSERT INTO workout_exercises (day, program, exercise_name, sets, reps, focus, notes, user_id, created_at)
  VALUES
    ('Monday', 'B', 'Back Squat', '5 × 5', '', 'Strength', NULL, v_user_id, NOW()),
    ('Monday', 'B', 'Kettlebell Swings', '4 × 15', '', 'Engine', NULL, v_user_id, NOW() + INTERVAL '1 second'),
    ('Monday', 'B', 'Row Erg', '4 × 500 m', '', 'Engine', NULL, v_user_id, NOW() + INTERVAL '2 seconds'),
    ('Tuesday', 'B', 'Zone 2 Cardio', '30–40 min', '', 'Cardio', 'Bike, run, or row — easy pace', v_user_id, NOW()),
    ('Wednesday', 'B', 'AMRAP', '12 min', '', 'Metcon', '8 burpees · 12 box jumps · 15 wall balls', v_user_id, NOW()),
    ('Wednesday', 'B', 'Cooldown Walk', '5–10 min', '', 'Recovery', NULL, v_user_id, NOW() + INTERVAL '1 second'),
    ('Thursday', 'B', 'Mobility Flow', '20 min', '', 'Mobility', 'Hips, T-spine, shoulders', v_user_id, NOW()),
    ('Friday', 'B', 'Deadlift', '5 × 3', '', 'Strength', NULL, v_user_id, NOW()),
    ('Friday', 'B', 'Push Press', '4 × 6', '', 'Power', NULL, v_user_id, NOW() + INTERVAL '1 second'),
    ('Friday', 'B', 'Pull-Ups', '4 × max reps', '', 'Gymnastics', NULL, v_user_id, NOW() + INTERVAL '2 seconds'),
    ('Saturday', 'B', 'Farmer Carry', '4 × 40 m', '', 'Longevity', NULL, v_user_id, NOW()),
    ('Saturday', 'B', 'Dead Hang', '4 × 30–45 sec', '', 'Longevity', NULL, v_user_id, NOW() + INTERVAL '1 second'),
    ('Saturday', 'B', 'Sled Push / Walk', '6 × 20 m', '', 'Longevity', NULL, v_user_id, NOW() + INTERVAL '2 seconds'),
    ('Sunday', 'B', 'Swim or Walk', '30–45 min easy', '', 'Recovery', NULL, v_user_id, NOW())
  ON CONFLICT (user_id, program, day, exercise_name) DO UPDATE
    SET sets = EXCLUDED.sets, focus = EXCLUDED.focus, notes = EXCLUDED.notes;

END $$;
