import { supabase } from '@/integrations/supabase/client';
import {
  PROGRAM_A_DAYS,
  PROGRAM_A_EXERCISES,
  PROGRAM_A_PLANS,
  type ProgramADay,
  type TrainingProgram,
} from '@/data/programA';

const buildExerciseRows = (program: TrainingProgram, userId: string) =>
  PROGRAM_A_DAYS.flatMap((day: ProgramADay) =>
    PROGRAM_A_EXERCISES[day].map((exercise) => ({
      day,
      program,
      exercise_name: exercise.name,
      sets: exercise.sets,
      reps: '',
      focus: exercise.focus ?? null,
      notes: exercise.notes ?? null,
      user_id: userId,
    }))
  );

/** Replace Program A exercises + plans (does not touch Program B). */
export async function replaceProgramA(userId: string): Promise<void> {
  const { error: deleteExercisesError } = await supabase
    .from('workout_exercises')
    .delete()
    .eq('user_id', userId)
    .eq('program', 'A')
    .in('day', [...PROGRAM_A_DAYS]);

  if (deleteExercisesError) throw deleteExercisesError;

  const { error: insertExercisesError } = await supabase
    .from('workout_exercises')
    .insert(buildExerciseRows('A', userId));

  if (insertExercisesError) throw insertExercisesError;

  for (const day of PROGRAM_A_DAYS) {
    const { data: existing } = await supabase
      .from('workout_plans')
      .select('id')
      .eq('user_id', userId)
      .eq('program', 'A')
      .eq('day', day)
      .maybeSingle();

    const workout = PROGRAM_A_PLANS[day];

    if (existing?.id) {
      const { error } = await supabase
        .from('workout_plans')
        .update({ workout })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('workout_plans').insert({
        day,
        program: 'A',
        workout,
        user_id: userId,
      });
      if (error) throw error;
    }
  }
}

/** @deprecated Use replaceProgramA */
export const replaceOfficialWorkoutRoutine = replaceProgramA;
