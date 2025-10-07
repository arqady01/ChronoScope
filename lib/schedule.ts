export type ShiftType = 'early' | 'mid' | 'late' | 'off';

export type ShiftVisualConfig = {
  label: string;
  shortLabel: string;
  accent: string;
  textColor: string;
  softBackground: string;
  defaultTime: string | null;
};

export type Task = {
  id: string;
  title: string;
  timeRange?: string;
  description?: string;
};

export type DaySchedule = {
  key: string;
  date: Date;
  shift: ShiftType;
  shiftTime: string | null;
  colleagues: string[];
  tasks: Task[];
  notes?: string;
};

export type CalendarDay = {
  key: string;
  date: Date;
  isCurrentMonth: boolean;
};

export type ShiftTimeRange = {
  start: string;
  end: string;
};

export type ShiftTimeValue = ShiftTimeRange | null;

export type ShiftTimeMap = Record<ShiftType, ShiftTimeValue>;

export const SHIFT_CONFIG: Record<ShiftType, ShiftVisualConfig> = {
  early: {
    label: '早班',
    shortLabel: '早班',
    accent: '#FFAE58',
    textColor: '#FF8A00',
    softBackground: 'rgba(255, 174, 88, 0.18)',
    defaultTime: '07:30 - 14:30',
  },
  mid: {
    label: '中班',
    shortLabel: '中班',
    accent: '#735BF2',
    textColor: '#5236EB',
    softBackground: 'rgba(115, 91, 242, 0.18)',
    defaultTime: '16:00 - 22:30',
  },
  late: {
    label: '晚班',
    shortLabel: '晚班',
    accent: '#146BC2',
    textColor: '#0E56A0',
    softBackground: 'rgba(20, 107, 194, 0.18)',
    defaultTime: '22:30 - 08:30',
  },
  off: {
    label: '休息日',
    shortLabel: '休',
    accent: '#2EBD59',
    textColor: '#228B43',
    softBackground: 'rgba(46, 189, 89, 0.16)',
    defaultTime: null,
  },
};

export const SHIFT_OPTIONS: ShiftType[] = ['off', 'early', 'mid', 'late'];

const EARLY_FALLBACK: ShiftTimeRange = { start: '07:30', end: '14:30' };
const MID_FALLBACK: ShiftTimeRange = { start: '16:00', end: '22:30' };
const LATE_FALLBACK: ShiftTimeRange = { start: '22:30', end: '08:30' };

export const DEFAULT_SHIFT_TIMES: ShiftTimeMap = {
  early: parseTimeRange(SHIFT_CONFIG.early.defaultTime) ?? { ...EARLY_FALLBACK },
  mid: parseTimeRange(SHIFT_CONFIG.mid.defaultTime) ?? { ...MID_FALLBACK },
  late: parseTimeRange(SHIFT_CONFIG.late.defaultTime) ?? { ...LATE_FALLBACK },
  off: null,
};

export const DEFAULT_COLLEAGUES: string[] = [];

const BASE_SCHEDULE: Record<string, Partial<DaySchedule>> = {
  '2025-09-02': {
    tasks: [{ id: 'task-2025-09-02-1', title: '复盘晨会纪要', timeRange: '09:00', description: '整理班前会重点提醒内容。' }],
  },
  '2025-09-08': {
    colleagues: ['李晓', '张明华', '王思雅', '蔡敏'],
    notes: '今天整体排班较轻松，记得巡场时顺手检查物资。',
  },
  '2025-09-09': {
    colleagues: ['骆晓丹', '吴大雨', '诸葛靓', '庞觉'],
    tasks: [
      { id: 'task-1', title: '校对字幕单', timeRange: '10:00 - 13:00', description: '确保活动厅字幕模板全部更新，交接给下个班次。' },
      { id: 'task-2', title: '潜睡一会醒来继续鏖战', timeRange: '14:00 - 15:00', description: '补充精力后梳理夜班值守 FAQ。' },
      { id: 'task-3', title: '喝水并远眺', timeRange: '19:00 - 20:00', description: '伸展肩颈，缓解久坐疲劳。' },
    ],
  },
  '2025-09-15': {
    notes: '轮休日，去做一直想预约的体检。',
  },
  '2025-09-22': {
    tasks: [{ id: 'task-2025-09-22-1', title: '月末库存盘点', timeRange: '17:00', description: '与仓储组核对耗材数量。' }],
  },
};

export type ScheduleBuildOptions = {
  shiftTimes?: Partial<ShiftTimeMap>;
  colleaguePool?: string[];
};

export function buildCalendarDays(monthDate: Date): CalendarDay[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const daysInMonth = lastDayOfMonth.getDate();
  const offsetFromMonday = (firstDayOfMonth.getDay() + 6) % 7;
  const totalCells = Math.ceil((offsetFromMonday + daysInMonth) / 7) * 7;

  const startDate = new Date(year, month, 1 - offsetFromMonday);

  return Array.from({ length: totalCells }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      key: formatDateKey(date),
      date,
      isCurrentMonth: date.getMonth() === month,
    };
  });
}

export function buildDaySchedule(
  key: string,
  date: Date,
  override?: Partial<DaySchedule>,
  options?: ScheduleBuildOptions,
): DaySchedule {
  const base = BASE_SCHEDULE[key] ?? {};
  const shift = override?.shift ?? base.shift ?? 'off';
  const shiftConfig = SHIFT_CONFIG[shift];
  const effectiveShiftTimes = options?.shiftTimes;
  const defaultTime = computeDefaultShiftTime(shift, effectiveShiftTimes);
  const defaultColleaguesSource = override?.colleagues ?? base.colleagues;
  const defaultColleagues = shift === 'off'
    ? []
    : Array.isArray(defaultColleaguesSource)
      ? [...defaultColleaguesSource]
      : [];

  return {
    key,
    date,
    shift,
    shiftTime: override?.shiftTime ?? base.shiftTime ?? defaultTime,
    colleagues: defaultColleagues,
    tasks: override?.tasks ?? base.tasks ?? deriveTasks(date),
    notes: override?.notes ?? base.notes,
  };
}

export function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function formatShiftTimeRange(range: ShiftTimeValue): string | null {
  if (!range) {
    return null;
  }
  if (!range.start || !range.end) {
    return null;
  }
  return `${range.start} - ${range.end}`;
}

export function cloneShiftTimeValue(value: ShiftTimeValue): ShiftTimeValue {
  if (!value) {
    return null;
  }
  return { ...value };
}

export function cloneShiftTimeMap(map: ShiftTimeMap): ShiftTimeMap {
  return {
    early: cloneShiftTimeValue(map.early),
    mid: cloneShiftTimeValue(map.mid),
    late: cloneShiftTimeValue(map.late),
    off: cloneShiftTimeValue(map.off),
  };
}

function computeDefaultShiftTime(shift: ShiftType, overrides?: Partial<ShiftTimeMap>): string | null {
  if (shift === 'off') {
    return null;
  }

  const overrideValue = overrides?.[shift];
  if (overrideValue !== undefined) {
    return formatShiftTimeRange(overrideValue) ?? SHIFT_CONFIG[shift].defaultTime;
  }

  const fallback = DEFAULT_SHIFT_TIMES[shift];
  const formatted = formatShiftTimeRange(fallback);
  if (formatted) {
    return formatted;
  }

  return SHIFT_CONFIG[shift].defaultTime;
}

function parseTimeRange(value: string | null | undefined): ShiftTimeRange | null {
  if (!value) {
    return null;
  }
  const [startRaw, endRaw] = value.split('-');
  if (!startRaw || !endRaw) {
    return null;
  }
  const start = startRaw.trim();
  const end = endRaw.trim();
  if (!start || !end) {
    return null;
  }
  return { start, end };
}

function deriveTasks(date: Date): Task[] {
  const day = date.getDate();
  if (day % 6 === 0) {
    return [
      {
        id: `${formatDateKey(date)}-task`,
        title: '更新交接日志',
        timeRange: '18:30',
        description: '确保上一班遗留问题有处理反馈。',
      },
    ];
  }

  return [];
}
