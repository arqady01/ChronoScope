import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  DEFAULT_COLLEAGUES,
  DEFAULT_SHIFT_TIMES,
  buildDaySchedule,
  cloneShiftTimeMap,
  cloneShiftTimeValue,
  parseDateKey,
  type DaySchedule,
  type ShiftTimeMap,
  type ShiftTimeValue,
  type ShiftType,
} from '@/lib/schedule';

type ScheduleOverrides = Record<string, Partial<DaySchedule>>;

type ScheduleContextValue = {
  overrides: ScheduleOverrides;
  updateOverride: (
    key: string,
    updater: (prev: Partial<DaySchedule> | undefined) => Partial<DaySchedule> | undefined
  ) => void;
  getScheduleForDate: (key: string, date?: Date) => DaySchedule;
  shiftTimes: ShiftTimeMap;
  setShiftTime: (shift: Exclude<ShiftType, 'off'>, value: ShiftTimeValue) => void;
  resetShiftTimes: () => void;
  colleaguePool: string[];
  addColleague: (name: string) => void;
  updateColleague: (index: number, name: string) => void;
  removeColleague: (index: number) => void;
  resetColleagues: () => void;
};

const ScheduleContext = createContext<ScheduleContextValue | undefined>(undefined);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<ScheduleOverrides>({});
  const [shiftTimes, setShiftTimes] = useState<ShiftTimeMap>(() => cloneShiftTimeMap(DEFAULT_SHIFT_TIMES));
  const [colleaguePool, setColleaguePool] = useState<string[]>(() => [...DEFAULT_COLLEAGUES]);

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

  const setShiftTime = useCallback((shift: Exclude<ShiftType, 'off'>, value: ShiftTimeValue) => {
    setShiftTimes((prev) => {
      const nextValue = cloneShiftTimeValue(value);
      const currentValue = prev[shift];

      const hasChanged = (() => {
        if (!currentValue && !nextValue) {
          return false;
        }
        if (!currentValue || !nextValue) {
          return true;
        }
        return (
          currentValue.start !== nextValue.start ||
          currentValue.end !== nextValue.end
        );
      })();

      if (!hasChanged) {
        return prev;
      }

      return {
        ...prev,
        [shift]: nextValue,
      };
    });
  }, []);

  const resetShiftTimes = useCallback(() => {
    setShiftTimes(cloneShiftTimeMap(DEFAULT_SHIFT_TIMES));
  }, []);

  const addColleague = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    setColleaguePool((prev) => {
      if (prev.includes(trimmed)) {
        return prev;
      }
      return [...prev, trimmed];
    });
  }, []);

  const updateColleague = useCallback((index: number, name: string) => {
    setColleaguePool((prev) => {
      if (!prev[index]) {
        return prev;
      }

      const trimmed = name.trim();
      if (!trimmed) {
        return prev.filter((_, idx) => idx !== index);
      }

      const duplicateIndex = prev.findIndex((existing) => existing === trimmed);
      if (duplicateIndex !== -1 && duplicateIndex !== index) {
        const filtered = prev.filter((_, idx) => idx !== index);
        return filtered;
      }

      const next = [...prev];
      next[index] = trimmed;
      return next;
    });
  }, []);

  const removeColleague = useCallback((index: number) => {
    setColleaguePool((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const resetColleagues = useCallback(() => {
    setColleaguePool(() => [...DEFAULT_COLLEAGUES]);
  }, []);

  const getScheduleForDate = useCallback(
    (key: string, date?: Date) =>
      buildDaySchedule(key, date ?? parseDateKey(key), overrides[key], {
        shiftTimes,
        colleaguePool,
      }),
    [overrides, shiftTimes, colleaguePool],
  );

  const value = useMemo(
    () => ({
      overrides,
      updateOverride,
      getScheduleForDate,
      shiftTimes,
      setShiftTime,
      resetShiftTimes,
      colleaguePool,
      addColleague,
      updateColleague,
      removeColleague,
      resetColleagues,
    }),
    [
      overrides,
      updateOverride,
      getScheduleForDate,
      shiftTimes,
      setShiftTime,
      resetShiftTimes,
      colleaguePool,
      addColleague,
      updateColleague,
      removeColleague,
      resetColleagues,
    ],
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
