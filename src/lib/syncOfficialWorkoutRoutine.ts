import { supabase } from '@/integrations/supabase/client';
import {
  OFFICIAL_WORKOUT_EXERCISES,
  ROUTINE_WEEKDAYS,
  type RoutineWeekday,
} from '@/data/officialWorkoutRoutine';

/** Deletes Mon–Thu exercises and inserts the canonical program (fixes legacy DB rows). */
export async function replaceOfficialWorkoutRoutine(userId: string): Promise<void> {
  const { error: deleteError } = await supabase
    .from('workout_exercises')
    .delete()
    .eq('user_id', userId)
    .in('day', [...ROUTINE_WEEKDAYS]);

  if (deleteError) throw deleteError;

  const rows = ROUTINE_WEEKDAYS.flatMap((day: RoutineWeekday) =>
    OFFICIAL_WORKOUT_EXERCISES[day].map((exercise) => ({
      day,
      exercise_name: exercise.name,
      sets: exercise.sets,
      reps: '',
      focus: exercise.focus ?? null,
      notes: exercise.notes ?? null,
      user_id: userId,
    }))
  );

  const { error: insertError } = await supabase.from('workout_exercises').insert(rows);

  if (insertError) throw insertError;
}
