-- Optional one-time cleanup: wipe all YOUR workout data so the DB is empty again.
-- After this, add everything fresh from the app (syncs to Supabase automatically).
-- Only affects your account (auth.uid()).

DELETE FROM workout_completions
WHERE user_id = auth.uid();

DELETE FROM workout_exercises
WHERE user_id = auth.uid();

DELETE FROM workout_plans
WHERE user_id = auth.uid();
