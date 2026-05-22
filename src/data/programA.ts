export type TrainingProgram = 'A' | 'B';

export type ProgramExercise = {
  name: string;
  sets: string;
  focus?: string;
  notes?: string;
};

export const PROGRAM_A_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export type ProgramADay = (typeof PROGRAM_A_DAYS)[number];

export const PROGRAM_A_PLANS: Record<ProgramADay, string> = {
  Monday: 'Push',
  Tuesday: 'Pull',
  Wednesday: 'Short Run',
  Thursday: 'Legs',
  Friday: 'Shoulders',
  Saturday: 'Long Run',
  Sunday: 'Swimming',
};

export const PROGRAM_A_EXERCISES: Record<ProgramADay, ProgramExercise[]> = {
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
  Wednesday: [{ name: 'Run', sets: '4–8 km', focus: 'Cardio' }],
  Thursday: [
    { name: 'Squats', sets: '4 sets × 6–10', focus: 'Legs' },
    { name: 'Bulgarian Split Squats', sets: '3 sets × 10–12', focus: 'Legs' },
    { name: 'Leg Extensions', sets: '2–3 sets to failure', focus: 'Legs' },
    { name: 'Leg Curls', sets: '3 sets × 10–15', focus: 'Legs' },
    { name: 'Romanian Deadlifts (RDLs)', sets: '4 sets × 8–12', focus: 'Legs' },
    { name: 'Calf Raises', sets: '4 sets × 12–20', focus: 'Calves' },
    { name: 'Core', sets: 'Exercises of choice', focus: 'Core' },
  ],
  Friday: [
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
  Saturday: [{ name: 'Run', sets: '10–15 km', focus: 'Cardio' }],
  Sunday: [{ name: 'Swimming', sets: 'Recovery session', focus: 'Cardio' }],
};
