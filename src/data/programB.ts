import type { ProgramExercise } from '@/data/programA';

/** Program B — CrossFit / longevity (starter mock; replace after AI design). */
export const PROGRAM_B_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export type ProgramBDay = (typeof PROGRAM_B_DAYS)[number];

export const PROGRAM_B_PLANS: Record<ProgramBDay, string> = {
  Monday: 'Strength + Engine',
  Tuesday: 'Aerobic Base',
  Wednesday: 'Metcon',
  Thursday: 'Mobility',
  Friday: 'Power + Pull',
  Saturday: 'Longevity',
  Sunday: 'Recovery',
};

export const PROGRAM_B_EXERCISES: Record<ProgramBDay, ProgramExercise[]> = {
  Monday: [
    { name: 'Back Squat', sets: '5 × 5', focus: 'Strength' },
    { name: 'Kettlebell Swings', sets: '4 × 15', focus: 'Engine' },
    { name: 'Row Erg', sets: '4 × 500 m', focus: 'Engine' },
  ],
  Tuesday: [
    { name: 'Zone 2 Cardio', sets: '30–40 min', focus: 'Aerobic', notes: 'Bike, run, or row — easy pace' },
  ],
  Wednesday: [
    { name: 'AMRAP', sets: '12 min', focus: 'Metcon', notes: '8 burpees · 12 box jumps · 15 wall balls' },
    { name: 'Cooldown Walk', sets: '5–10 min', focus: 'Recovery' },
  ],
  Thursday: [
    { name: 'Mobility Flow', sets: '20 min', focus: 'Mobility', notes: 'Hips, T-spine, shoulders' },
  ],
  Friday: [
    { name: 'Deadlift', sets: '5 × 3', focus: 'Strength' },
    { name: 'Push Press', sets: '4 × 6', focus: 'Power' },
    { name: 'Pull-Ups', sets: '4 × max reps', focus: 'Gymnastics' },
  ],
  Saturday: [
    { name: 'Farmer Carry', sets: '4 × 40 m', focus: 'Longevity' },
    { name: 'Dead Hang', sets: '4 × 30–45 sec', focus: 'Longevity' },
    { name: 'Sled Push / Walk', sets: '6 × 20 m', focus: 'Longevity' },
  ],
  Sunday: [
    { name: 'Swim or Walk', sets: '30–45 min easy', focus: 'Recovery' },
  ],
};
