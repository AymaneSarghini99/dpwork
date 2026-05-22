import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { TrainingProgram } from '@/data/programA';

export type ProgramOverride = TrainingProgram | null;

export type TrainingCycleInfo = {
  activeProgram: TrainingProgram;
  weekInCycle: 1 | 2 | 3;
  label: string;
};

export const getActiveProgram = (
  date: Date,
  cycleStartDate: string,
  programOverride: ProgramOverride = null
): TrainingProgram => {
  if (programOverride) return programOverride;

  const start = parseISO(cycleStartDate);
  const days = Math.max(0, differenceInCalendarDays(date, start));
  const weekInCycle = Math.floor(days / 7) % 3;

  return weekInCycle <= 1 ? 'A' : 'B';
};

export const getTrainingCycleInfo = (
  date: Date,
  cycleStartDate: string,
  programOverride: ProgramOverride = null
): TrainingCycleInfo => {
  const start = parseISO(cycleStartDate);
  const days = Math.max(0, differenceInCalendarDays(date, start));
  const weekIndex = Math.floor(days / 7) % 3;
  const weekInCycle = (weekIndex + 1) as 1 | 2 | 3;
  const activeProgram = programOverride ?? (weekIndex <= 1 ? 'A' : 'B');

  return {
    activeProgram,
    weekInCycle,
    label: `Week ${weekInCycle} · Program ${activeProgram}`,
  };
};
