import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { TrainingProgram } from '@/data/programA';
import {
  getTrainingCycleInfo,
  type ProgramOverride,
} from '@/lib/trainingCycle';

export const useTrainingCycle = () => {
  const { user } = useAuth();
  const [cycleStartDate, setCycleStartDate] = useState(() =>
    format(new Date(), 'yyyy-MM-dd')
  );
  const [programOverride, setProgramOverride] = useState<ProgramOverride>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setReady(true);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_training_settings')
          .select('cycle_start_date, program_override')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setCycleStartDate(data.cycle_start_date);
          setProgramOverride(
            data.program_override === 'A' || data.program_override === 'B'
              ? data.program_override
              : null
          );
        } else {
          const today = format(new Date(), 'yyyy-MM-dd');
          await supabase.from('user_training_settings').insert({
            user_id: user.id,
            cycle_start_date: today,
          });
          setCycleStartDate(today);
        }
      } catch (err) {
        console.error('Error loading training settings:', err);
      } finally {
        setReady(true);
      }
    };

    void load();
  }, [user]);

  const cycleInfo = useMemo(
    () => getTrainingCycleInfo(new Date(), cycleStartDate, programOverride),
    [cycleStartDate, programOverride]
  );

  const saveProgramMode = async (override: ProgramOverride) => {
    if (!user) {
      setProgramOverride(override);
      return;
    }

    const { error } = await supabase.from('user_training_settings').upsert({
      user_id: user.id,
      cycle_start_date: cycleStartDate,
      program_override: override,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    setProgramOverride(override);
  };

  return {
    ready,
    cycleInfo,
    activeProgram: cycleInfo.activeProgram as TrainingProgram,
    programOverride,
    cycleStartDate,
    saveProgramMode,
  };
};
