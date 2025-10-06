import { formatDateKey, type DaySchedule, type ShiftType } from './schedule';

type ScheduleResolver = (key: string, date?: Date) => DaySchedule;

type MonthCount = {
  workDays: number;
  restDays: number;
  early: number;
  mid: number;
  late: number;
  off: number;
};

const WORK_SHIFTS: ShiftType[] = ['early', 'mid', 'late'];

const MONDAY_FIRST_WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export type MonthlyWorkRestStat = {
  month: number;
  workDays: number;
  restDays: number;
};

export type MonthlyShiftDistributionStat = {
  month: number;
  early: number;
  mid: number;
  late: number;
};

export type WeeklyWorkPatternStat = {
  weekday: number;
  label: string;
  workDays: number;
};

export function aggregateMonthlyWorkRestDaysByYear({
  year,
  getScheduleForDate,
}: {
  year: number;
  getScheduleForDate: ScheduleResolver;
}): MonthlyWorkRestStat[] {
  return Array.from({ length: 12 }, (_, index) => {
    const counts = countMonth({ year, monthIndex: index, getScheduleForDate });
    return {
      month: index + 1,
      workDays: counts.workDays,
      restDays: counts.restDays,
    };
  });
}

export function aggregateShiftTypeDistributionByYear({
  year,
  getScheduleForDate,
}: {
  year: number;
  getScheduleForDate: ScheduleResolver;
}): MonthlyShiftDistributionStat[] {
  return Array.from({ length: 12 }, (_, index) => {
    const counts = countMonth({ year, monthIndex: index, getScheduleForDate });
    return {
      month: index + 1,
      early: counts.early,
      mid: counts.mid,
      late: counts.late,
    };
  });
}

export function calculateWeeklyWorkPatternByMonth({
  year,
  month,
  getScheduleForDate,
}: {
  year: number;
  month: number;
  getScheduleForDate: ScheduleResolver;
}): WeeklyWorkPatternStat[] {
  const countsByWeekday: Record<number, number> = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  };

  iterateMonthDays({ year, monthIndex: month - 1, getScheduleForDate }, (date, schedule) => {
    if (!WORK_SHIFTS.includes(schedule.shift)) {
      return;
    }

    countsByWeekday[date.getDay()] += 1;
  });

  return MONDAY_FIRST_WEEKDAY_ORDER.map((weekday) => ({
    weekday,
    label: formatWeekdayLabel(weekday),
    workDays: countsByWeekday[weekday],
  }));
}

function countMonth({
  year,
  monthIndex,
  getScheduleForDate,
}: {
  year: number;
  monthIndex: number;
  getScheduleForDate: ScheduleResolver;
}): MonthCount {
  const counts: MonthCount = {
    workDays: 0,
    restDays: 0,
    early: 0,
    mid: 0,
    late: 0,
    off: 0,
  };

  iterateMonthDays({ year, monthIndex, getScheduleForDate }, (_date, schedule) => {
    if (WORK_SHIFTS.includes(schedule.shift)) {
      counts.workDays += 1;
      counts[schedule.shift] += 1;
    } else {
      counts.restDays += 1;
      counts.off += 1;
    }
  });

  return counts;
}

function iterateMonthDays({
  year,
  monthIndex,
  getScheduleForDate,
}: {
  year: number;
  monthIndex: number;
  getScheduleForDate: ScheduleResolver;
},
callback: (date: Date, schedule: DaySchedule) => void) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, monthIndex, day);
    const key = formatDateKey(date);
    const schedule = getScheduleForDate(key, date);
    callback(date, schedule);
  }
}

function formatWeekdayLabel(weekday: number): string {
  switch (weekday) {
    case 0:
      return '周日';
    case 1:
      return '周一';
    case 2:
      return '周二';
    case 3:
      return '周三';
    case 4:
      return '周四';
    case 5:
      return '周五';
    case 6:
      return '周六';
    default:
      return '';
  }
}
