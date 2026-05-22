import {
  PROGRAM_A_DAYS,
  PROGRAM_A_EXERCISES,
  PROGRAM_A_PLANS,
  type ProgramADay,
  type TrainingProgram,
} from '@/data/programA';
import {
  PROGRAM_B_DAYS,
  PROGRAM_B_EXERCISES,
  PROGRAM_B_PLANS,
  type ProgramBDay,
} from '@/data/programB';
import type { Database } from '@/integrations/supabase/types';

type WorkoutPlan = Database['public']['Tables']['workout_plans']['Row'];
type WorkoutExercise = { id?: string; name: string; sets: string };

const buildPlans = (
  storageUserId: string,
  program: TrainingProgram,
  days: readonly string[],
  plans: Record<string, string>
): WorkoutPlan[] =>
  days.map((day) => ({
    id: `local_${day}_${program}`,
    day,
    workout: plans[day],
    program,
    user_id: storageUserId,
    created_at: new Date().toISOString(),
  }));

const buildExercises = (
  days: readonly string[],
  exercises: Record<string, { name: string; sets: string }[]>
): Record<string, WorkoutExercise[]> => {
  const grouped: Record<string, WorkoutExercise[]> = {};
  for (const day of days) {
    grouped[day] = (exercises[day] ?? []).map((ex, index) => ({
      id: `local_${day}_${index}`,
      name: ex.name,
      sets: ex.sets,
    }));
  }
  return grouped;
};

/** True only in Vite dev server on localhost — never in production builds. */
export const isLocalDevMockEnabled = () =>
  import.meta.env.DEV &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

export const buildLocalDevProgramAPlans = (storageUserId: string): WorkoutPlan[] =>
  buildPlans(storageUserId, 'A', PROGRAM_A_DAYS, PROGRAM_A_PLANS);

export const buildLocalDevProgramAExercises = (): Record<string, WorkoutExercise[]> =>
  buildExercises(PROGRAM_A_DAYS, PROGRAM_A_EXERCISES);

export const buildLocalDevProgramBPlans = (storageUserId: string): WorkoutPlan[] =>
  buildPlans(storageUserId, 'B', PROGRAM_B_DAYS, PROGRAM_B_PLANS);

export const buildLocalDevProgramBExercises = (): Record<string, WorkoutExercise[]> =>
  buildExercises(PROGRAM_B_DAYS, PROGRAM_B_EXERCISES);

export const buildLocalDevPlans = (
  storageUserId: string,
  program: TrainingProgram
): WorkoutPlan[] =>
  program === 'A'
    ? buildLocalDevProgramAPlans(storageUserId)
    : buildLocalDevProgramBPlans(storageUserId);

export const buildLocalDevExercises = (
  program: TrainingProgram
): Record<string, WorkoutExercise[]> =>
  program === 'A' ? buildLocalDevProgramAExercises() : buildLocalDevProgramBExercises();
