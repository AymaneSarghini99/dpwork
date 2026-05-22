/** Bump when Program A layout changes (triggers one-time DB replace for legacy rows). */
export const OFFICIAL_WORKOUT_ROUTINE_VERSION = '2025-05-v4-full-week';

export {
  PROGRAM_A_DAYS as ROUTINE_WEEKDAYS,
  PROGRAM_A_PLANS as OFFICIAL_WORKOUT_PLANS,
  PROGRAM_A_EXERCISES as OFFICIAL_WORKOUT_EXERCISES,
  type ProgramADay as RoutineWeekday,
  type ProgramExercise as RoutineExercise,
} from '@/data/programA';

const LEGACY_MONDAY_NAMES = new Set([
  'Incline Dumbbell Press',
  'Shoulder Press',
  'Lateral Raises',
]);

/** Detect old DB layout (Wed shoulders, Mon mock exercises, etc.). */
export const isLegacyWorkoutRoutine = (
  exercisesByDay: Record<string, { name: string; sets: string }[]>
): boolean => {
  const monday = exercisesByDay.Monday ?? [];
  if (monday.some((e) => LEGACY_MONDAY_NAMES.has(e.name))) return true;

  const bench = monday.find((e) => e.name === 'Bench Press');
  if (bench?.sets.includes('4 sets × 6–10')) return true;

  const wednesday = exercisesByDay.Wednesday ?? [];
  if (wednesday.some((e) => e.name === 'Overhead Press')) return true;

  const friday = exercisesByDay.Friday ?? [];
  if (friday.length === 0 && wednesday.some((e) => e.name === 'Overhead Press')) return true;

  const saturday = exercisesByDay.Saturday ?? [];
  if (saturday.length === 0 && (exercisesByDay.Monday?.length ?? 0) > 0) return true;

  return false;
};

export const getRoutineVersionKey = (userId: string) =>
  `workout_routine_version_${userId}`;
