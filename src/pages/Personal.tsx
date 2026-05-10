import { useEffect, useState } from "react";
import { format, startOfWeek, addDays, isToday, isSameDay } from "date-fns";
import { Check, Edit2, Plus, X, Calendar, Dumbbell, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type WorkoutPlan = Database['public']['Tables']['workout_plans']['Row'];
type WorkoutCompletion = Database['public']['Tables']['workout_completions']['Row'];

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const DEFAULT_WORKOUTS = {
  'Monday': 'PUSH',
  'Tuesday': 'Short run (5-8k)',
  'Wednesday': 'LEGS',
  'Thursday': 'Swimming + Rehab',
  'Friday': 'PULL',
  'Saturday': 'Long run (10-12k) + Rehab',
  'Sunday': 'Swimming'
};

const Personal = () => {
  const { user } = useAuth();
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [completions, setCompletions] = useState<WorkoutCompletion[]>([]);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutPlan | null>(null);
  const [editDay, setEditDay] = useState('');
  const [editWorkout, setEditWorkout] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showWorkoutPopup, setShowWorkoutPopup] = useState(false);
  const [popupWorkout, setPopupWorkout] = useState<WorkoutPlan | null>(null);
  
  const today = new Date();
  const todayName = format(today, 'EEEE');
  const todayWorkout = workoutPlans.find(w => w.day === todayName);
  const isTodayCompleted = completions.some(c => 
    isSameDay(new Date(c.date), today) && c.workout_id === todayWorkout?.id
  );

  // Load workout plans and completions
  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
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
        const storedPlans = localStorage.getItem(`workout_plans_${user.id}`);
        const storedCompletions = localStorage.getItem(`workout_completions_${user.id}`);
        
        if (storedPlans) {
          setWorkoutPlans(JSON.parse(storedPlans));
        } else {
          // Create default plans and store them
          const defaultPlans = DAYS_OF_WEEK.map(day => ({
            id: `${user.id}_${day}`,
            day,
            workout: DEFAULT_WORKOUTS[day as keyof typeof DEFAULT_WORKOUTS],
            user_id: user.id,
            created_at: new Date().toISOString()
          }));
          setWorkoutPlans(defaultPlans);
          localStorage.setItem(`workout_plans_${user.id}`, JSON.stringify(defaultPlans));
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

  const createDefaultWorkoutPlans = async () => {
    if (!user) return;

    try {
      const defaultPlans = DAYS_OF_WEEK.map(day => ({
        day,
        workout: DEFAULT_WORKOUTS[day as keyof typeof DEFAULT_WORKOUTS],
        user_id: user.id
      }));

      const { data, error } = await (supabase
        .from('workout_plans' as any)
        .insert(defaultPlans as any)
        .select());

      if (error) throw error;
      setWorkoutPlans(data || []);
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
  };

  
  const handleSaveEdit = async () => {
    if (!editingWorkout || !user) return;

    try {
      const updateData = { 
        day: editDay, 
        workout: editWorkout 
      };

      const { error } = await (supabase as any)
        .from('workout_plans')
        .update(updateData)
        .eq('id', editingWorkout.id)
        .eq('user_id', user.id);

      if (error) throw error;

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
    if (!todayWorkout || !user) return;

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
    if (!user || !todayWorkout) return;
    
    const isCompleted = isWorkoutCompleted(date);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    try {
      if (isCompleted) {
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
        // Add completion
        const completionData = {
          date: dateStr,
          workout_id: todayWorkout.id,
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

      <h1 className="text-xs md:text-sm text-spaced text-muted-foreground font-light mb-12 animate-fade-in flex items-center justify-center w-full max-w-2xl">
        <Dumbbell className="w-4 h-4 mr-3" />
        <span>PERSONAL WORKOUT</span>
      </h1>

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
                      className={`border-b border-white/5 transition-colors ${
                        isCurrentDay ? 'bg-white/[0.02]' : 'hover:bg-white/[0.01]'
                      }`}
                    >
                      <td className={`p-4 text-sm font-medium ${isCurrentDay ? 'text-yellow-400' : 'text-muted-foreground'}`}>
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
                            onClick={() => handleShowWorkoutPopup(workout)}
                            className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
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

      {/* Workout Calendar */}
      <div className="w-full max-w-4xl animate-fade-in">
        <div className="glass rounded-2xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-light text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Workout Tracker
            </h3>
            <div className="text-xs text-muted-foreground">
              {format(currentMonth, 'MMMM yyyy')}
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-xs text-muted-foreground p-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {getCalendarDays().map((date, index) => {
              const isCompleted = isWorkoutCompleted(date);
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
              const isTodayDate = isToday(date);
              
              return (
                <div
                  key={index}
                  className={`aspect-square flex items-center justify-center rounded-lg text-xs transition-colors cursor-pointer ${
                    isTodayDate 
                      ? 'bg-primary/20 text-primary border border-primary/30' 
                      : isCompleted 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : isCurrentMonth 
                          ? 'text-foreground hover:bg-white/[0.05]' 
                          : 'text-muted-foreground/30'
                  }`}
                  onClick={() => handleCalendarClick(date)}
                >
                  {format(date, 'd')}
                </div>
              );
            })}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {getCalendarDays().map((date, index) => {
            const isCompleted = isWorkoutCompleted(date);
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
            const isTodayDate = isToday(date);
            
            return (
              <div
                key={index}
                className={`aspect-square flex items-center justify-center rounded-lg text-xs transition-colors cursor-pointer ${
                  isTodayDate 
                    ? 'bg-primary/20 text-primary border border-primary/30' 
                    : isCompleted 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : isCurrentMonth 
                        ? 'text-foreground hover:bg-white/[0.05]' 
                        : 'text-muted-foreground/30'
                }`}
                onClick={() => handleCalendarClick(date)}
              >
                {format(date, 'd')}
              </div>
            );
          })}
        </div>
      </div>
    </div>

    {/* Workout Details Popup */}
      {showWorkoutPopup && popupWorkout && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div className="glass rounded-3xl p-4 sm:p-6 max-w-lg mx-4 relative max-h-[85vh] overflow-y-auto border border-white/10 shadow-2xl" style={{minWidth: '320px'}}>
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
              {popupWorkout.day === 'Monday' && (
                <>
                  <div className="glass rounded-2xl p-6 border border-white/5">
                    <h4 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                      Bench Press
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-foreground font-medium">3 sets × 8–12 reps</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="glass rounded-2xl p-6 border border-white/5">
                    <h4 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      Incline Dumbbell Press
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-foreground font-medium">3 sets × 8–12 reps</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="glass rounded-2xl p-6 border border-white/5">
                    <h4 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      Shoulder Press
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-foreground font-medium">3 sets × 8–12 reps</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="glass rounded-2xl p-6 border border-white/5">
                    <h4 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      Lateral Raises
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-foreground font-medium">3 sets × 12–15 reps</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="glass rounded-2xl p-6 border border-white/5">
                    <h4 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      Tricep Pushdowns
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-foreground font-medium">3 sets × 10–15 reps</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="glass rounded-2xl p-6 border border-white/5">
                    <h4 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      Push-Ups
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-foreground font-medium">2 sets to failure</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Personal;
