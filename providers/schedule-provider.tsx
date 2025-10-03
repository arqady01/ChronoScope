import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { buildDaySchedule, parseDateKey, type DaySchedule } from '@/lib/schedule';

type ScheduleOverrides = Record<string, Partial<DaySchedule>>;

type ScheduleContextValue = {
  overrides: ScheduleOverrides;
  updateOverride: (
    key: string,
    updater: (prev: Partial<DaySchedule> | undefined) => Partial<DaySchedule> | undefined
  ) => void;
  getScheduleForDate: (key: string, date?: Date) => DaySchedule;
};

const ScheduleContext = createContext<ScheduleContextValue | undefined>(undefined);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<ScheduleOverrides>({});

  const updateOverride = useCallback(
    (
      key: string,
      updater: (prev: Partial<DaySchedule> | undefined) => Partial<DaySchedule> | undefined,
    ) => {
      setOverrides((prev) => {
        const current = prev[key];
        const nextValue = updater(current);

        if (!nextValue || Object.keys(nextValue).length === 0) {
          if (!current) {
            return prev;
          }
          const { [key]: _removed, ...rest } = prev;
          return rest;
        }

        return {
          ...prev,
          [key]: nextValue,
        };
      });
    },
    [],
  );

  const getScheduleForDate = useCallback(
    (key: string, date?: Date) => buildDaySchedule(key, date ?? parseDateKey(key), overrides[key]),
    [overrides],
  );

  const value = useMemo(
    () => ({
      overrides,
      updateOverride,
      getScheduleForDate,
    }),
    [overrides, updateOverride, getScheduleForDate],
  );

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within ScheduleProvider');
  }
  return context;
}
