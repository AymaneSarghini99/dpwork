/** Bump when the canonical program changes (triggers one-time DB replace for legacy rows). */
export const OFFICIAL_WORKOUT_ROUTINE_VERSION = '2025-05-v2';

export const ROUTINE_WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
] as const;

export type RoutineWeekday = (typeof ROUTINE_WEEKDAYS)[number];

export type RoutineExercise = {
  name: string;
  sets: string;
  focus?: string;
  notes?: string;
};

export const OFFICIAL_WORKOUT_PLANS: Record<RoutineWeekday, string> = {
  Monday: 'Push',
  Tuesday: 'Pull',
  Wednesday: 'Shoulders',
  Thursday: 'Legs',
};

export const OFFICIAL_WORKOUT_EXERCISES: Record<RoutineWeekday, RoutineExercise[]> = {
  Monday: [
    { name: 'Incline Press', sets: '4 sets × 6–10', focus: 'Chest' },
    { name: 'Bench Press', sets: '3–4 sets × 6–8', focus: 'Chest' },
    { name: 'Cable Chest Fly', sets: '3 sets × 10–15', focus: 'Chest' },
    { name: 'Weighted Dips', sets: '3 sets × 8–12', focus: 'Chest' },
    { name: 'Rope Pushdowns', sets: '3 sets × 10–15', focus: 'Triceps' },
    { name: 'Overhead Cable Tricep Extension', sets: '3 sets × 10–15', focus: 'Triceps' },
    { name: 'Push-ups', sets: '2 sets to failure', focus: 'Finisher' },
  ],
  Tuesday: [
    { name: 'Pull-Ups', sets: '4 sets × 6–10', focus: 'Back' },
    { name: 'Barbell Rows', sets: '4 sets × 8–12', focus: 'Back' },
    { name: 'Seated Cable Row', sets: '3 sets × 8–12', focus: 'Back' },
    { name: 'Face Pulls', sets: '3 sets × 12–15', focus: 'Back' },
    { name: 'Biceps Curls', sets: '3 sets × 10–12', focus: 'Biceps' },
    { name: 'Hammer Curls', sets: '3 sets × 10–12', focus: 'Biceps' },
  ],
  Wednesday: [
    { name: 'Overhead Press', sets: '3–4 sets × 6–8', focus: 'Shoulders' },
    {
      name: 'Dumbbell Lateral Raises',
      sets: '5 sets × 12–20',
      focus: 'Shoulders',
      notes: 'Most important for width',
    },
    { name: 'Reverse Pec Deck', sets: '3–4 sets × 12–15', focus: 'Shoulders' },
    { name: 'Face Pulls', sets: '3 sets × 12–15', focus: 'Shoulders' },
    { name: 'Seated Biceps Curls', sets: '3 sets × 10–12', focus: 'Biceps' },
  ],
  Thursday: [
    { name: 'Squats', sets: '4 sets × 6–10', focus: 'Legs' },
    { name: 'Bulgarian Split Squats', sets: '3 sets × 10–12', focus: 'Legs' },
    { name: 'Leg Extensions', sets: '2–3 sets to failure', focus: 'Legs' },
    { name: 'Leg Curls', sets: '3 sets × 10–15', focus: 'Legs' },
    { name: 'Romanian Deadlifts (RDLs)', sets: '4 sets × 8–12', focus: 'Legs' },
    { name: 'Calf Raises', sets: '4 sets × 12–20', focus: 'Calves' },
  ],
};

const LEGACY_MONDAY_NAMES = new Set([
  'Incline Dumbbell Press',
  'Shoulder Press',
  'Lateral Raises',
]);

/** Old seeded Push day (4 exercises) stored in Supabase before the v2 program. */
export const isLegacyWorkoutRoutine = (
  exercisesByDay: Record<string, { name: string; sets: string }[]>
): boolean => {
  const monday = exercisesByDay.Monday ?? [];
  if (monday.some((e) => LEGACY_MONDAY_NAMES.has(e.name))) return true;

  const bench = monday.find((e) => e.name === 'Bench Press');
  if (bench?.sets.includes('4 sets × 6–10')) return true;

  return false;
};

export const getRoutineVersionKey = (userId: string) =>
  `workout_routine_version_${userId}`;
