import { useEffect, useMemo, useState } from "react";
import { format, startOfWeek, startOfMonth, endOfMonth, addDays, subDays, isToday, isSameDay } from "date-fns";
import { Check, Edit2, Plus, X, Calendar, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type WorkoutPlan = Database['public']['Tables']['workout_plans']['Row'];
type WorkoutCompletion = Database['public']['Tables']['workout_completions']['Row'];
type SmokingDay = Database['public']['Tables']['smoking_days']['Row'];

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const DEFAULT_WORKOUTS = {
  'Monday': 'PUSH',
  'Tuesday': 'PULL',
  'Wednesday': 'Mid Run 4-8 km',
  'Thursday': 'LEGS',
  'Friday': 'Shoulders',
  'Saturday': 'Long run (10-12k)',
  'Sunday': 'Swimming'
};

type WorkoutExercise = { name: string; sets: string };

const createDefaultPopupExercises = (): Record<string, WorkoutExercise[]> => ({
  Monday: [
    { name: 'Bench Press', sets: '4 sets × 6–10 reps' },
    { name: 'Incline Dumbbell Press', sets: '3 sets × 8–12 reps' },
    { name: 'Shoulder Press', sets: '3 sets × 8–12 reps' },
    { name: 'Lateral Raises', sets: '3 sets × 12–15 reps' },
    { name: 'Tricep Pushdowns', sets: '3 sets × 10–15 reps' },
    { name: 'Push-Ups', sets: '2 sets to failure' },
  ],
  Tuesday: [
    { name: 'Pull-Ups', sets: '3 sets × 6–10 reps' },
    { name: 'Barbell Rows', sets: '4 sets × 6–10 reps' },
    { name: 'Lat Pulldowns', sets: '3 sets × 10–12 reps' },
    { name: 'Face Pulls', sets: '3 sets × 15–20 reps' },
    { name: 'Bicep Curls', sets: '3 sets × 10–12 reps' },
    { name: 'Hammer Curls', sets: '3 sets × 10–12 reps' },
  ],
  Wednesday: [
    { name: 'Mid Run', sets: '4–8 km' },
  ],
  Thursday: [
    { name: 'Squats', sets: '4 sets × 6–10 reps' },
    { name: 'Romanian Deadlifts', sets: '3 sets × 8–12 reps' },
    { name: 'Leg Press', sets: '3 sets × 10–15 reps' },
    { name: 'Leg Curls', sets: '3 sets × 12–15 reps' },
    { name: 'Calf Raises', sets: '3 sets × 15–20 reps' },
    { name: 'Lunges', sets: '3 sets × 10 reps each leg' },
  ],
  Friday: [
    { name: 'Overhead Press', sets: '4 sets × 6–10 reps' },
    { name: 'Dumbbell Shoulder Press', sets: '3 sets × 8–12 reps' },
    { name: 'Arnold Press', sets: '3 sets × 10–12 reps' },
    { name: 'Lateral Raises', sets: '3 sets × 12–15 reps' },
    { name: 'Front Raises', sets: '3 sets × 12–15 reps' },
    { name: 'Rear Delt Flyes', sets: '3 sets × 15–20 reps' },
  ],
  Saturday: [
    { name: 'Long Run', sets: '10–12 km' },
  ],
  Sunday: [
    { name: 'Swimming', sets: '30–45 min' },
  ],
});

const getPopupStorageKey = (userId: string) => `workout_exercises_${userId}`;
const getWorkoutStorageKey = (userId: string) => `workout_plans_${userId}`;
const getCompletionStorageKey = (userId: string) => `workout_completions_${userId}`;
const getSmokingStorageKey = (userId: string) => `smoking_days_${userId}`;

const isLocalDevHost = () =>
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const getPersistenceUserId = (userId: string | undefined) => {
  if (userId) return userId;
  return isLocalDevHost() ? 'local-dev' : null;
};

const buildDefaultWorkoutPlans = (userId: string): WorkoutPlan[] => (
  DAYS_OF_WEEK.map(day => ({
    id: `${userId}_${day}`,
    day,
    workout: DEFAULT_WORKOUTS[day as keyof typeof DEFAULT_WORKOUTS],
    user_id: userId,
    created_at: new Date().toISOString(),
  }))
);

const isSmokeFreeMarked = (days: SmokingDay[], date: Date) =>
  days.some((d) => isSameDay(new Date(d.date), date));

/** Consecutive smoke-free days ending on this date (1, 2, 3, …) */
const getSmokeFreeStreak = (days: SmokingDay[], date: Date): number => {
  if (!isSmokeFreeMarked(days, date)) return 0;
  let streak = 0;
  let cursor = date;
  while (isSmokeFreeMarked(days, cursor)) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }
  return streak;
};

const getActiveStreak = (days: SmokingDay[]) => {
  const today = new Date();
  if (isSmokeFreeMarked(days, today)) return getSmokeFreeStreak(days, today);
  return getSmokeFreeStreak(days, subDays(today, 1));
};

const getLongestStreak = (days: SmokingDay[]) => {
  if (days.length === 0) return 0;
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let max = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const { date } of sorted) {
    const d = new Date(date);
    if (prev && isSameDay(addDays(prev, 1), d)) run += 1;
    else run = 1;
    max = Math.max(max, run);
    prev = d;
  }
  return max;
};

const Personal = () => {
  const { user } = useAuth();
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [completions, setCompletions] = useState<WorkoutCompletion[]>([]);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutPlan | null>(null);
  const [editDay, setEditDay] = useState('');
  const [editWorkout, setEditWorkout] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [smokingMonth, setSmokingMonth] = useState(new Date());
  const [smokingDays, setSmokingDays] = useState<SmokingDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWorkoutPopup, setShowWorkoutPopup] = useState(false);
  const [popupWorkout, setPopupWorkout] = useState<WorkoutPlan | null>(null);
  const [editingPopupExercise, setEditingPopupExercise] = useState<{ day: string; index: number } | null>(null);
  const [editExerciseName, setEditExerciseName] = useState('');
  const [editExerciseSets, setEditExerciseSets] = useState('');
  const [popupExercises, setPopupExercises] = useState<Record<string, WorkoutExercise[]>>(() => createDefaultPopupExercises());

  // Meal system
  const [activeTab, setActiveTab] = useState<'workouts' | 'meals' | 'smoking'>('workouts');
  
  // Drag and drop state
  const [draggedDay, setDraggedDay] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [draggedExerciseIndex, setDraggedExerciseIndex] = useState<number | null>(null);
  const [dragOverExerciseIndex, setDragOverExerciseIndex] = useState<number | null>(null);

  const MEAL_POOL = [
    'Beef + Rice',
    'Beef + Sweet Potato',
    'Chicken + Rice',
    'Chicken + Sweet Potato',
    'Chicken + Noodles',
    '5 eggs + Bread',
    '5 eggs + Oats',
    'Tuna + Rice',
    'Protein shake + Banana',
  ];

  const getTodayMeals = () => {
    const saved = localStorage.getItem('dpwork_meals_today');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.date === format(new Date(), 'yyyy-MM-dd')) {
        return parsed.meals as string[];
      }
    }
    return [];
  };

  const [todayMeals, setTodayMeals] = useState<string[]>(() => getTodayMeals());

  const toggleMeal = (meal: string) => {
    setTodayMeals(prev => {
      const exists = prev.includes(meal);
      const updated = exists
        ? prev.filter(m => m !== meal)
        : [...prev, meal];
      localStorage.setItem('dpwork_meals_today', JSON.stringify({
        date: format(new Date(), 'yyyy-MM-dd'),
        meals: updated,
      }));
      return updated;
    });
  };

  const clearTodayMeals = () => {
    setTodayMeals([]);
    localStorage.setItem('dpwork_meals_today', JSON.stringify({
      date: format(new Date(), 'yyyy-MM-dd'),
      meals: [],
    }));
  };

  // Drag and drop handlers
  const handleDragStart = (day: string) => {
    setDraggedDay(day);
  };

  const handleDragOver = (e: React.DragEvent, day: string) => {
    e.preventDefault();
    setDragOverDay(day);
  };

  const handleDragLeave = () => {
    setDragOverDay(null);
  };

  const handleDrop = (e: React.DragEvent, targetDay: string) => {
    e.preventDefault();
    setDragOverDay(null);
    
    if (!draggedDay || draggedDay === targetDay) return;
    
    // Find the workout plans for both days
    const draggedWorkout = workoutPlans.find(w => w.day === draggedDay);
    const targetWorkout = workoutPlans.find(w => w.day === targetDay);
    
    if (!draggedWorkout || !targetWorkout) return;
    
    // Swap the workout assignments
    setWorkoutPlans(prev => prev.map(workout => {
      if (workout.id === draggedWorkout.id) {
        return { ...workout, day: targetDay };
      }
      if (workout.id === targetWorkout.id) {
        return { ...workout, day: draggedDay };
      }
      return workout;
    }));
    
    setDraggedDay(null);
    toast.success('Workouts reordered');
  };

  // Exercise drag and drop handlers
  const handleExerciseDragStart = (index: number) => {
    setDraggedExerciseIndex(index);
  };

  const handleExerciseDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverExerciseIndex(index);
  };

  const handleExerciseDragLeave = () => {
    setDragOverExerciseIndex(null);
  };

  const handleExerciseDrop = (e: React.DragEvent, targetIndex: number, day: string) => {
    e.preventDefault();
    setDragOverExerciseIndex(null);
    
    if (draggedExerciseIndex === null || draggedExerciseIndex === targetIndex) return;
    
    const exercises = [...(popupExercises[day] || [])];
    const draggedExercise = exercises[draggedExerciseIndex];
    
    if (!draggedExercise) return;
    
    // Remove from old position and insert at new position
    exercises.splice(draggedExerciseIndex, 1);
    exercises.splice(targetIndex, 0, draggedExercise);
    
    setPopupExercises(prev => ({
      ...prev,
      [day]: exercises
    }));
    
    setDraggedExerciseIndex(null);
    toast.success('Exercise reordered');
  };
  
  const today = new Date();
  const todayName = format(today, 'EEEE');
  const todayWorkout = workoutPlans.find(w => w.day === todayName);
  const isTodayCompleted = completions.some(c => 
    isSameDay(new Date(c.date), today) && c.workout_id === todayWorkout?.id
  );

  // Load workout plans and completions
  useEffect(() => {
    loadData();
    loadSmokingDays();
  }, [user]);

  useEffect(() => {
    const storageUserId = getPersistenceUserId(user?.id);
    if (!storageUserId) return;

    try {
      const stored = localStorage.getItem(getPopupStorageKey(storageUserId));
      if (!stored) {
        setPopupExercises(createDefaultPopupExercises());
        return;
      }

      const parsed = JSON.parse(stored) as Record<string, WorkoutExercise[]>;
      setPopupExercises(parsed);
    } catch (error) {
      console.error('Error loading workout exercises from localStorage:', error);
      setPopupExercises(createDefaultPopupExercises());
    }
  }, [user]);

  useEffect(() => {
    const storageUserId = getPersistenceUserId(user?.id);
    if (!storageUserId) return;

    try {
      localStorage.setItem(getPopupStorageKey(storageUserId), JSON.stringify(popupExercises));
    } catch (error) {
      console.error('Error saving workout exercises to localStorage:', error);
    }
  }, [popupExercises, user]);

  const loadData = async () => {
    const storageUserId = getPersistenceUserId(user?.id);
    if (!storageUserId) {
      setLoading(false);
      return;
    }

    if (!user && isLocalDevHost()) {
      try {
        const storedPlans = localStorage.getItem(getWorkoutStorageKey(storageUserId));
        const storedCompletions = localStorage.getItem(getCompletionStorageKey(storageUserId));

        const storedSmoking = localStorage.getItem(getSmokingStorageKey(storageUserId));

        setWorkoutPlans(storedPlans ? JSON.parse(storedPlans) : buildDefaultWorkoutPlans(storageUserId));
        setCompletions(storedCompletions ? JSON.parse(storedCompletions) : []);
        setSmokingDays(storedSmoking ? JSON.parse(storedSmoking) : []);
      } catch (error) {
        console.error('Error loading local dev workout data:', error);
        setWorkoutPlans(buildDefaultWorkoutPlans(storageUserId));
        setCompletions([]);
        setSmokingDays([]);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    try {
      // Try to load from Supabase first
      const { data: plans, error: plansError } = await (supabase
        .from('workout_plans' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }));

      if (plansError) throw plansError;

      // Load completions
      const { data: comps, error: compsError } = await (supabase
        .from('workout_completions' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true }));

      if (compsError) throw compsError;

      // If no workout plans exist, create default ones
      if (!plans || plans.length === 0) {
        await createDefaultWorkoutPlans();
      } else {
        setWorkoutPlans(plans);
      }

      setCompletions(comps || []);
    } catch (error) {
      console.error('Error loading workout data from Supabase:', error);
      
      // Fallback to localStorage if Supabase fails
      try {
        const storedPlans = localStorage.getItem(getWorkoutStorageKey(storageUserId));
        const storedCompletions = localStorage.getItem(getCompletionStorageKey(storageUserId));
        
        if (storedPlans) {
          setWorkoutPlans(JSON.parse(storedPlans));
        } else {
          // Create default plans and store them
          const defaultPlans = buildDefaultWorkoutPlans(storageUserId);
          setWorkoutPlans(defaultPlans);
          localStorage.setItem(getWorkoutStorageKey(storageUserId), JSON.stringify(defaultPlans));
        }
        
        if (storedCompletions) {
          setCompletions(JSON.parse(storedCompletions));
        } else {
          setCompletions([]);
        }
        
        toast.info('Using local storage (database tables not available)');
      } catch (localError) {
        console.error('Error loading from localStorage:', localError);
        toast.error('Failed to load workout data');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSmokingDays = async () => {
    const storageUserId = getPersistenceUserId(user?.id);
    if (!storageUserId) return;

    if (!user && isLocalDevHost()) {
      try {
        const stored = localStorage.getItem(getSmokingStorageKey(storageUserId));
        setSmokingDays(stored ? JSON.parse(stored) : []);
      } catch (error) {
        console.error('Error loading local smoking days:', error);
        setSmokingDays([]);
      }
      return;
    }

    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('smoking_days')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;
      setSmokingDays(data || []);
    } catch (error) {
      console.error('Error loading smoking days:', error);
      try {
        const stored = localStorage.getItem(getSmokingStorageKey(storageUserId));
        setSmokingDays(stored ? JSON.parse(stored) : []);
      } catch {
        setSmokingDays([]);
      }
    }
  };

  const getSmokingCalendarDays = () => {
    const start = startOfWeek(smokingMonth, { weekStartsOn: 1 });
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  };

  const getSmokingDayEntry = (date: Date) =>
    smokingDays.find((d) => isSameDay(new Date(d.date), date));

  const smokingStats = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(smokingMonth);
    const monthEnd = endOfMonth(smokingMonth);

    const monthDays = smokingDays.filter((d) => {
      const date = new Date(d.date);
      return date >= monthStart && date <= monthEnd;
    });

    return {
      currentStreak: getActiveStreak(smokingDays),
      longestStreak: getLongestStreak(smokingDays),
      monthDays: monthDays.length,
      totalDays: smokingDays.length,
      todayStreak: getSmokeFreeStreak(smokingDays, today),
      monthLabel: format(smokingMonth, 'MMMM'),
    };
  }, [smokingDays, smokingMonth]);

  const persistSmokingDays = (storageUserId: string, updated: SmokingDay[]) => {
    setSmokingDays(updated);
    localStorage.setItem(getSmokingStorageKey(storageUserId), JSON.stringify(updated));
  };

  const handleSmokingCalendarClick = async (date: Date) => {
    const storageUserId = getPersistenceUserId(user?.id);
    if (!storageUserId) return;

    const existing = getSmokingDayEntry(date);
    const dateStr = format(date, 'yyyy-MM-dd');

    try {
      if (existing) {
        if (!user) {
          const updated = smokingDays.filter((d) => !isSameDay(new Date(d.date), date));
          persistSmokingDays(storageUserId, updated);
          toast.success('Day unmarked');
          return;
        }

        const { error } = await supabase
          .from('smoking_days')
          .delete()
          .eq('date', dateStr)
          .eq('user_id', user.id);

        if (error) throw error;

        setSmokingDays((prev) => prev.filter((d) => !isSameDay(new Date(d.date), date)));
        toast.success('Day unmarked');
      } else {
        const newEntry: SmokingDay = {
          id: Date.now().toString(),
          date: dateStr,
          count: 1,
          user_id: storageUserId,
          created_at: new Date().toISOString(),
        };

        if (!user) {
          persistSmokingDays(storageUserId, [...smokingDays, newEntry]);
          const streak = getSmokeFreeStreak([...smokingDays, newEntry], date);
          toast.success(`Day ${streak} smoke-free`);
          return;
        }

        const { data, error } = await supabase
          .from('smoking_days')
          .insert({ date: dateStr, user_id: user.id })
          .select()
          .single();

        if (error) throw error;

        const next = [...smokingDays, data];
        setSmokingDays(next);
        toast.success(`Day ${getSmokeFreeStreak(next, date)} smoke-free`);
      }
    } catch (error) {
      console.error('Error updating smoking day:', error);
      toast.error('Failed to update day');
    }
  };

  const createDefaultWorkoutPlans = async () => {
    const storageUserId = getPersistenceUserId(user?.id);
    if (!storageUserId) return;

    const defaultPlans = buildDefaultWorkoutPlans(storageUserId);
    setWorkoutPlans(defaultPlans);
    try {
      localStorage.setItem(getWorkoutStorageKey(storageUserId), JSON.stringify(defaultPlans));
    } catch (storageError) {
      console.error('Error saving default workout plans to localStorage:', storageError);
    }

    if (!user) {
      return;
    }

    try {
      const { data, error } = await (supabase
        .from('workout_plans' as any)
        .insert(defaultPlans as any)
        .select());

      if (error) throw error;
      if (data && data.length > 0) {
        setWorkoutPlans(data);
      }
    } catch (error) {
      console.error('Error creating default workout plans:', error);
      toast.error('Failed to create workout plans');
    }
  };

  const handleEditWorkout = (workout: WorkoutPlan) => {
    setEditingWorkout(workout);
    setEditDay(workout.day);
    setEditWorkout(workout.workout);
  };

  const handleShowWorkoutPopup = (workout: WorkoutPlan) => {
    setPopupWorkout(workout);
    setShowWorkoutPopup(true);
  };

  const handleCloseWorkoutPopup = () => {
    setShowWorkoutPopup(false);
    setPopupWorkout(null);
    setEditingPopupExercise(null);
  };

  const handleEditPopupExercise = (day: string, index: number, exercise: WorkoutExercise) => {
    setEditingPopupExercise({ day, index });
    setEditExerciseName(exercise.name);
    setEditExerciseSets(exercise.sets);
  };

  const handleSavePopupExercise = () => {
    if (!editingPopupExercise) return;

    setPopupExercises(prev => {
      const exercises = [...(prev[editingPopupExercise.day] || [])];
      const current = exercises[editingPopupExercise.index];

      if (!current) return prev;

      exercises[editingPopupExercise.index] = {
        name: editExerciseName.trim() || current.name,
        sets: editExerciseSets.trim() || current.sets,
      };

      return {
        ...prev,
        [editingPopupExercise.day]: exercises,
      };
    });

    setEditingPopupExercise(null);
    toast.success('Exercise updated');
  };

  const handleAddPopupExercise = (day: string) => {
    setPopupExercises(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), { name: 'New Exercise', sets: '3 sets × 10 reps' }],
    }));
  };

  const handleRemovePopupExercise = (day: string, index: number) => {
    setPopupExercises(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }));
    toast.success('Exercise removed');
  };

  const handleSaveEdit = async () => {
    const storageUserId = getPersistenceUserId(user?.id);
    if (!editingWorkout || !storageUserId) return;

    try {
      const updateData = { 
        day: editDay, 
        workout: editWorkout 
      };

      if (user) {
        const { error } = await (supabase as any)
          .from('workout_plans')
          .update(updateData)
          .eq('id', editingWorkout.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const nextPlans = workoutPlans.map(w => w.id === editingWorkout.id
          ? { ...w, day: editDay, workout: editWorkout }
          : w
        );
        setWorkoutPlans(nextPlans);
        localStorage.setItem(getWorkoutStorageKey(storageUserId), JSON.stringify(nextPlans));
      }

      setWorkoutPlans(prev => 
        prev.map(w => w.id === editingWorkout.id 
          ? { ...w, day: editDay, workout: editWorkout }
          : w
        )
      );

      setEditingWorkout(null);
      toast.success('Workout updated successfully');
    } catch (error) {
      console.error('Error updating workout:', error);
      toast.error('Failed to update workout');
    }
  };

  const handleCompleteWorkout = async () => {
    const storageUserId = getPersistenceUserId(user?.id);
    if (!todayWorkout || !storageUserId) return;

    try {
      const todayStr = format(today, 'yyyy-MM-dd');
      
      // Check if already completed
      const alreadyCompleted = completions.some(c => 
        c.date === todayStr && c.workout_id === todayWorkout.id
      );
      
      if (alreadyCompleted) {
        toast.info('Workout already completed today');
        return;
      }

      if (!user) {
        const updatedCompletions = [
          ...completions,
          {
            id: Date.now().toString(),
            date: todayStr,
            workout_id: todayWorkout.id,
            user_id: storageUserId,
            completed_at: new Date().toISOString()
          }
        ];
        setCompletions(updatedCompletions);
        localStorage.setItem(getCompletionStorageKey(storageUserId), JSON.stringify(updatedCompletions));
        toast.success('Workout completed!');
        return;
      }

      const completionData = {
        date: todayStr,
        workout_id: todayWorkout.id,
        user_id: user.id
      };

      const { error } = await (supabase
        .from('workout_completions' as any)
        .insert(completionData as any));

      if (error) throw error;

      setCompletions(prev => [...prev, {
        id: Date.now().toString(),
        date: todayStr,
        workout_id: todayWorkout.id,
        user_id: user.id,
        completed_at: new Date().toISOString()
      }]);

      toast.success('Workout completed!');
    } catch (error) {
      console.error('Error completing workout:', error);
      toast.error('Failed to complete workout');
    }
  };

  const getCalendarDays = () => {
    const start = startOfWeek(currentMonth, { weekStartsOn: 1 }); // Monday
    const days = [];
    
    for (let i = 0; i < 42; i++) { // 6 weeks
      days.push(addDays(start, i));
    }
    
    return days;
  };

  const isWorkoutCompleted = (date: Date) => {
    return completions.some(c => isSameDay(new Date(c.date), date));
  };

  const handleCalendarClick = async (date: Date) => {
    const storageUserId = getPersistenceUserId(user?.id);
    if (!storageUserId) return;

    const workoutForDate = workoutPlans.find(w => w.day === format(date, 'EEEE'));
    if (!workoutForDate) return;
    
    const isCompleted = isWorkoutCompleted(date);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    try {
      if (isCompleted) {
        if (!user) {
          const updated = completions.filter(c => !isSameDay(new Date(c.date), date));
          setCompletions(updated);
          localStorage.setItem(getCompletionStorageKey(storageUserId), JSON.stringify(updated));
          toast.success('Workout unmarked');
          return;
        }

        // Remove completion
        const { error } = await (supabase as any)
          .from('workout_completions')
          .delete()
          .eq('date', dateStr)
          .eq('user_id', user.id);
          
        if (error) throw error;
        
        setCompletions(prev => prev.filter(c => !isSameDay(new Date(c.date), date)));
        toast.success('Workout unmarked');
      } else {
        if (!user) {
          const updated = [
            ...completions,
            {
              id: Date.now().toString(),
              date: dateStr,
              workout_id: workoutForDate.id,
              user_id: storageUserId,
              completed_at: new Date().toISOString()
            }
          ];
          setCompletions(updated);
          localStorage.setItem(getCompletionStorageKey(storageUserId), JSON.stringify(updated));
          toast.success('Workout completed!');
          return;
        }

        // Add completion
        const completionData = {
          date: dateStr,
          workout_id: workoutForDate.id,
          user_id: user.id
        };

        const { error } = await (supabase as any)
          .from('workout_completions')
          .insert(completionData);

        if (error) throw error;

        setCompletions(prev => [...prev, {
          id: Date.now().toString(),
          date: dateStr,
          workout_id: todayWorkout.id,
          user_id: user.id,
          completed_at: new Date().toISOString()
        }]);
        toast.success('Workout completed!');
      }
    } catch (error) {
      console.error('Error updating workout completion:', error);
      toast.error('Failed to update workout');
    }
  };

  if (loading) {
    return (
      <main className="relative min-h-screen w-full flex items-center justify-center px-4">
        <div className="text-muted-foreground">Loading...</div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-start md:justify-center px-4 sm:px-6 pt-12 md:pt-0 pb-40 md:pb-6 overflow-hidden">
      {/* ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-white/[0.02] blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-white/[0.015] blur-3xl" />
      </div>

      {/* Tab Header */}
      <div className="w-full max-w-4xl mt-10 mb-8 flex items-center justify-center gap-8 animate-fade-in">
        <button
          onClick={() => setActiveTab('workouts')}
          className={`text-sm tracking-[0.2em] transition-colors ${
            activeTab === 'workouts'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground/70'
          }`}
        >
          Workouts
        </button>
        <span className="text-muted-foreground/30">·</span>
        <button
          onClick={() => setActiveTab('meals')}
          className={`text-sm tracking-[0.2em] transition-colors ${
            activeTab === 'meals'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground/70'
          }`}
        >
          Meals
        </button>
        <span className="text-muted-foreground/30">·</span>
        <button
          onClick={() => setActiveTab('smoking')}
          className={`text-sm tracking-[0.2em] transition-colors ${
            activeTab === 'smoking'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground/70'
          }`}
        >
          Smoking
        </button>
      </div>

      {/* Workouts Tab */}
      {activeTab === 'workouts' && (
        <>
          {/* Today's Workout */}
          <div className="w-full max-w-4xl mb-12 animate-fade-in">
            <div 
              className="glass rounded-2xl p-6 md:p-8 text-center cursor-pointer hover:bg-white/[0.05] transition-colors"
              onDoubleClick={() => {
                if (todayWorkout) {
                  handleCompleteWorkout();
                }
              }}
            >
              <h2 className="text-lg md:text-xl font-light text-foreground mb-2">
                TODAY'S WORKOUT
              </h2>
              <div className="text-2xl md:text-3xl font-medium text-foreground mb-6">
                {todayWorkout?.workout || 'Rest Day'}
              </div>
                      </div>
          </div>

          {/* Workout Plan Table */}
          <div className="w-full max-w-4xl mb-12 animate-fade-in">
            <div className="glass rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-4 text-xs tracking-[0.3em] text-muted-foreground uppercase">Day</th>
                      <th className="text-left p-4 text-xs tracking-[0.3em] text-muted-foreground uppercase">Workout</th>
                      <th className="text-right p-4 text-xs tracking-[0.3em] text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS_OF_WEEK.map((day, index) => {
                      const workout = workoutPlans.find(w => w.day === day);
                      const isCurrentDay = day === todayName;
                      
                      return (
                        <tr 
                          key={day} 
                          draggable
                          onDragStart={() => handleDragStart(day)}
                          onDragOver={(e) => handleDragOver(e, day)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, day)}
                          className={`border-b border-white/5 transition-colors cursor-move ${
                            isCurrentDay ? 'bg-white/[0.02]' : 'hover:bg-white/[0.01]'
                          } ${
                            dragOverDay === day ? 'bg-blue-500/10 border-blue-500/30' : ''
                          } ${
                            draggedDay === day ? 'opacity-50' : ''
                          }`}
                        >
                          <td className={`p-4 text-sm font-medium select-none ${isCurrentDay ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                            {day}
                          </td>
                          <td 
                            className={`p-4 text-sm cursor-pointer transition-colors ${
                              isCurrentDay ? 'text-yellow-400 hover:bg-white/[0.05]' : 'text-foreground hover:bg-white/[0.05]'
                            }`}
                            onClick={() => workout && handleEditWorkout(workout)}
                            onDoubleClick={() => {
                              if (isCurrentDay && workout) {
                                if (!isTodayCompleted) {
                                  handleCompleteWorkout();
                                } else {
                                  handleEditWorkout(workout);
                                }
                              }
                            }}
                          >
                            {editingWorkout?.id === workout?.id ? (
                              <input
                                value={editWorkout}
                                onChange={(e) => setEditWorkout(e.target.value)}
                                onBlur={handleSaveEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveEdit();
                                  }
                                }}
                                className="w-full h-8 px-2 text-sm text-foreground bg-transparent"
                                autoFocus
                              />
                            ) : (
                              workout?.workout || '-'
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {workout && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShowWorkoutPopup(workout);
                                }}
                                className="text-muted-foreground hover:text-foreground h-8 w-8 p-0 cursor-pointer"
                                type="button"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="w-full max-w-4xl mb-12 animate-fade-in">
            <div className="glass rounded-2xl p-5 md:p-6 border border-white/10">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
                    Workout Calendar
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                    className="w-8 h-8 rounded-full border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors"
                    type="button"
                  >
                    ‹
                  </button>
                  <div className="min-w-[160px] text-center text-sm text-foreground/90">
                    {format(currentMonth, 'MMMM yyyy')}
                  </div>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                    className="w-8 h-8 rounded-full border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors"
                    type="button"
                  >
                    ›
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day) => (
                  <div key={day} className="text-[10px] tracking-[0.2em] text-muted-foreground text-center py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {getCalendarDays().map((date, index) => {
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                  const isSelected = isWorkoutCompleted(date);
                  const isTodayDate = isToday(date);
                  const workoutForDate = workoutPlans.find(w => w.day === format(date, 'EEEE'));

                  return (
                    <button
                      key={`${date.toISOString()}-${index}`}
                      type="button"
                      onClick={() => handleCalendarClick(date)}
                      className={`aspect-square rounded-xl border text-left p-2 transition-all ${
                        isCurrentMonth ? 'opacity-100' : 'opacity-30'
                      } ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : 'bg-white/[0.02] border-white/5 text-foreground hover:bg-white/[0.05]'
                      } ${
                        isTodayDate ? 'ring-1 ring-white/30' : ''
                      }`}
                    >
                      <div className="flex h-full flex-col justify-between">
                        <span className="text-xs font-medium">{date.getDate()}</span>
                        <span className="text-[9px] leading-tight text-muted-foreground">
                          {workoutForDate?.workout || 'Rest'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Meals Tab */}
      {activeTab === 'meals' && (
        <div className="w-full max-w-2xl animate-fade-in space-y-8">
          {/* Meal Pool */}
          <div>
            <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase mb-6 text-center">
              All Meals
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {MEAL_POOL.map((meal) => {
                const isSelected = todayMeals.includes(meal);
                return (
                  <button
                    key={meal}
                    onClick={() => toggleMeal(meal)}
                    className={`glass rounded-xl p-4 text-left text-sm transition-all border ${
                      isSelected
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/5 text-foreground hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{meal}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Today's Meals */}
          {todayMeals.length > 0 && (
            <div className="glass rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
                  Today's Meals ({todayMeals.length})
                </h3>
                <button
                  onClick={clearTodayMeals}
                  className="text-xs text-muted-foreground/60 hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {todayMeals.map((meal) => (
                  <div
                    key={meal}
                    className="glass rounded-lg px-4 py-2 text-sm text-emerald-300 border border-emerald-500/30 bg-emerald-500/10"
                  >
                    {meal}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Smoking Tab */}
      {activeTab === 'smoking' && (
        <div className="w-full max-w-4xl animate-fade-in space-y-8">
          <h2 className="text-2xl md:text-3xl font-light text-foreground text-center tracking-wide">
            Smoke-free
          </h2>
          <p className="text-center text-sm text-muted-foreground -mt-4">
            Mark each day you did not smoke
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Current streak', value: smokingStats.currentStreak },
              { label: 'Best streak', value: smokingStats.longestStreak },
              { label: smokingStats.monthLabel, value: smokingStats.monthDays },
              { label: 'Total days', value: smokingStats.totalDays },
            ].map((stat) => (
              <div
                key={stat.label}
                className="glass rounded-xl p-4 border border-white/10 text-center"
              >
                <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase mb-1">
                  {stat.label}
                </p>
                <p className="text-2xl font-medium text-foreground tabular-nums">{stat.value}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-[10px] tracking-[0.15em] text-muted-foreground/70">
            Click to mark smoke-free · Click again to unmark
          </p>

          <div className="glass rounded-2xl p-5 md:p-6 border border-white/10">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">Calendar</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setSmokingMonth(new Date(smokingMonth.getFullYear(), smokingMonth.getMonth() - 1, 1))
                  }
                  className="w-8 h-8 rounded-full border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors"
                  type="button"
                >
                  ‹
                </button>
                <div className="min-w-[160px] text-center text-sm text-foreground/90">
                  {format(smokingMonth, 'MMMM yyyy')}
                </div>
                <button
                  onClick={() =>
                    setSmokingMonth(new Date(smokingMonth.getFullYear(), smokingMonth.getMonth() + 1, 1))
                  }
                  className="w-8 h-8 rounded-full border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors"
                  type="button"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                <div
                  key={`smoking-${day}-${i}`}
                  className="text-[10px] tracking-[0.2em] text-muted-foreground text-center py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {getSmokingCalendarDays().map((date, index) => {
                const isCurrentMonth = date.getMonth() === smokingMonth.getMonth();
                const streak = getSmokeFreeStreak(smokingDays, date);
                const isMarked = streak > 0;
                const isTodayDate = isToday(date);

                return (
                  <button
                    key={`smoking-${date.toISOString()}-${index}`}
                    type="button"
                    onClick={() => handleSmokingCalendarClick(date)}
                    className={`aspect-square rounded-xl border text-left p-2 transition-all ${
                      isCurrentMonth ? 'opacity-100' : 'opacity-30'
                    } ${
                      isMarked
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        : 'bg-white/[0.02] border-white/5 text-foreground hover:bg-white/[0.05]'
                    } ${isTodayDate ? 'ring-1 ring-white/30' : ''}`}
                  >
                    <div className="flex h-full flex-col justify-between">
                      <span className="text-xs font-medium">{date.getDate()}</span>
                      {isMarked && (
                        <span className="text-lg font-semibold tabular-nums leading-none">
                          {streak}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Workout Details Popup */}
      {showWorkoutPopup && popupWorkout && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div className="glass rounded-3xl p-4 sm:p-6 max-w-lg mx-4 relative max-h-[85vh] overflow-y-auto border border-white/10 shadow-2xl" style={{width: '600px'}}>
            <button
              onClick={handleCloseWorkoutPopup}
              className="absolute top-6 right-6 text-muted-foreground/70 hover:text-foreground transition-all duration-200 hover:bg-white/[0.1] rounded-full p-2"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4 mb-8">
              <div>
                <h3 className="text-2xl font-light text-foreground mb-2">
                  {popupWorkout.day}
                </h3>
                <p className="text-base text-muted-foreground">
                  {popupWorkout.workout}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {(popupExercises[popupWorkout.day] || []).map((exercise, index) => (
                <div 
                  key={`${exercise.name}-${index}`} 
                  draggable
                  onDragStart={() => handleExerciseDragStart(index)}
                  onDragOver={(e) => handleExerciseDragOver(e, index)}
                  onDragLeave={handleExerciseDragLeave}
                  onDrop={(e) => handleExerciseDrop(e, index, popupWorkout.day)}
                  className={`glass rounded-2xl p-6 border border-white/5 relative group cursor-move ${
                    dragOverExerciseIndex === index ? 'bg-blue-500/10 border-blue-500/30' : ''
                  } ${
                    draggedExerciseIndex === index ? 'opacity-50' : ''
                  }`}
                >
                  <button
                    onClick={() => handleRemovePopupExercise(popupWorkout.day, index)}
                    className="absolute top-4 right-4 text-muted-foreground/50 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {editingPopupExercise?.day === popupWorkout.day && editingPopupExercise.index === index ? (
                    <div className="space-y-3">
                      <input
                        value={editExerciseName}
                        onChange={(e) => setEditExerciseName(e.target.value)}
                        className="w-full h-8 px-2 text-lg font-medium text-foreground bg-transparent"
                        autoFocus
                      />
                      <input
                        value={editExerciseSets}
                        onChange={(e) => setEditExerciseSets(e.target.value)}
                        onBlur={handleSavePopupExercise}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSavePopupExercise();
                          }
                        }}
                        className="w-full h-8 px-2 text-sm text-foreground bg-transparent"
                      />
                    </div>
                  ) : (
                    <>
                      <h4
                        className="text-lg font-medium text-foreground mb-4 cursor-pointer hover:text-primary transition-colors pr-6"
                        onClick={() => handleEditPopupExercise(popupWorkout.day, index, exercise)}
                      >
                        {exercise.name}
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span
                            className="text-foreground font-medium cursor-pointer hover:text-primary transition-colors"
                            onClick={() => handleEditPopupExercise(popupWorkout.day, index, exercise)}
                          >
                            {exercise.sets}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <button
                onClick={() => handleAddPopupExercise(popupWorkout.day)}
                className="glass rounded-2xl p-4 border border-white/5 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-white/20 transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span className="text-sm font-medium">Add Exercise</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Personal;
