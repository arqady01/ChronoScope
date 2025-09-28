import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

const SHIFT_CONFIG: Record<ShiftType, ShiftVisualConfig> = {
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

const COLLEAGUES = ['李晓', '张明华', '王思雅', '蔡敏', '骆晓丹', '吴大雨', '诸葛靓', '庞觉', '陈意航', '周启航'];
const SHIFT_OPTIONS: ShiftType[] = ['off', 'early', 'mid', 'late'];

export default function HomeScreen() {
  const initialMonth = useMemo(() => new Date(2025, 8, 1), []); // 2025-09
  const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth);
  const [selectedDateKey, setSelectedDateKey] = useState<string>('2025-09-08');
  const [customOverrides, setCustomOverrides] = useState<Record<string, Partial<DaySchedule>>>({});

  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  const scheduleByDay = useMemo(() => {
    const map: Record<string, DaySchedule> = {};

    calendarDays.forEach(({ key, date }) => {
      map[key] = buildDaySchedule(key, date, customOverrides[key]);
    });

    return map;
  }, [calendarDays, customOverrides]);

  const selectedSchedule = scheduleByDay[selectedDateKey] ?? buildDaySchedule(selectedDateKey, parseISO(selectedDateKey));

  const monthLabel = useMemo(() => formatMonth(currentMonth), [currentMonth]);

  const calendarRows = useMemo(() => chunk(calendarDays, 7), [calendarDays]);

  const handleShiftChange = (shift: ShiftType) => {
    setCustomOverrides((prev) => {
      const next = { ...prev };
      const config = SHIFT_CONFIG[shift];
      const existing = next[selectedDateKey] ?? {};
      const updated: Partial<DaySchedule> = {
        ...existing,
        shift,
        shiftTime: shift === 'off' ? null : config.defaultTime,
      };
      next[selectedDateKey] = updated;
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <IconButton icon="chevron-back" onPress={() => changeMonth(-1, setCurrentMonth, setSelectedDateKey)} />
          <Text style={styles.monthTitle}>{monthLabel}</Text>
          <IconButton icon="chevron-forward" onPress={() => changeMonth(1, setCurrentMonth, setSelectedDateKey)} />
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map((label) => (
            <Text key={label} style={styles.weekdayLabel}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {calendarRows.map((row, rowIdx) => (
            <View key={`row-${rowIdx}`} style={styles.calendarRow}>
              {row.map((day) => {
                const schedule = scheduleByDay[day.key];
                const shiftConfig = SHIFT_CONFIG[schedule.shift];
                const isSelected = day.key === selectedDateKey;
                const hasTasks = schedule.tasks.length > 0;

                return (
                  <Pressable
                    key={day.key}
                    style={styles.dayCell}
                    onPress={() => setSelectedDateKey(day.key)}>
                    <View
                      style={[
                        styles.dayInner,
                        !day.isCurrentMonth && styles.outsideMonth,
                        isSelected && [styles.selectedDay, { borderColor: shiftConfig.accent }],
                      ]}>
                      {hasTasks ? (
                        <View style={styles.taskCountPill}> 
                          <Text style={[styles.taskCountText, { color: shiftConfig.textColor }]}>{schedule.tasks.length}</Text>
                        </View>
                      ) : null}

                      {schedule.shift === 'off' ? (
                        <View style={styles.offIndicator}>
                          <Text style={[styles.offIndicatorText, { color: SHIFT_CONFIG.off.textColor }]}>休</Text>
                        </View>
                      ) : null}

                      <Text
                        style={[
                          styles.dayNumber,
                          !day.isCurrentMonth && styles.outsideMonthText,
                          isSelected && { color: shiftConfig.textColor },
                        ]}>
                        {formatDayNumber(day.date)}
                      </Text>

                      {schedule.shift !== 'off' ? (
                        <Text
                          style={[
                            styles.shiftBadge,
                            {
                              color: shiftConfig.textColor,
                            },
                          ]}>
                          {shiftConfig.shortLabel}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <DayDetailsCard schedule={selectedSchedule} onShiftChange={handleShiftChange} />
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => {}}>
        <Ionicons name="add" size={28} color="white" />
      </Pressable>
    </SafeAreaView>
  );
}

type ShiftType = 'early' | 'mid' | 'late' | 'off';

type ShiftVisualConfig = {
  label: string;
  shortLabel: string;
  accent: string;
  textColor: string;
  softBackground: string;
  defaultTime: string | null;
};

type Task = {
  id: string;
  title: string;
  timeRange?: string;
  description?: string;
};

type DaySchedule = {
  key: string;
  date: Date;
  shift: ShiftType;
  shiftTime: string | null;
  colleagues: string[];
  tasks: Task[];
  notes?: string;
};

type CalendarDay = {
  key: string;
  date: Date;
  isCurrentMonth: boolean;
};

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function IconButton({ icon, onPress }: IconButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.iconButton}>
      <Ionicons name={icon} size={22} color="#18191F" />
    </Pressable>
  );
}

function DayDetailsCard({ schedule, onShiftChange }: { schedule: DaySchedule; onShiftChange: (shift: ShiftType) => void }) {
  const shiftConfig = SHIFT_CONFIG[schedule.shift];
  const dateLabel = formatChineseDate(schedule.date);

  return (
    <View style={styles.detailsCard}>
      <Text style={styles.sectionTitle}>{`班次信息 - ${dateLabel}`}</Text>

      <View style={styles.shiftSelectorRow}>
        {SHIFT_OPTIONS.map((option) => {
          const optionConfig = SHIFT_CONFIG[option];
          const isActive = schedule.shift === option;
          return (
            <Pressable
              key={option}
              onPress={() => onShiftChange(option)}
              style={[
                styles.shiftOption,
                {
                  borderColor: optionConfig.textColor,
                },
                isActive && [styles.shiftOptionActive, { backgroundColor: optionConfig.softBackground, borderColor: optionConfig.accent }],
              ]}>
              <Text
                style={[
                  styles.shiftOptionLabel,
                  { color: optionConfig.textColor },
                  isActive && { color: optionConfig.accent },
                ]}>
                {option === 'off' ? '休息' : optionConfig.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.shiftSummary, { backgroundColor: shiftConfig.softBackground }]}> 
        <Text style={[styles.shiftSummaryText, { color: shiftConfig.textColor }]}> 
          {schedule.shift === 'off' ? '休息日' : `${shiftConfig.label} ${schedule.shiftTime ?? shiftConfig.defaultTime ?? ''}`}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>今日共事</Text>
      <View style={styles.colleagueWrap}>
        {schedule.colleagues.map((name) => (
          <View key={name} style={styles.colleaguePill}>
            <Text style={styles.colleagueText}>{name}</Text>
          </View>
        ))}
        {schedule.colleagues.length === 0 && (
          <Text style={styles.emptyHint}>暂无安排</Text>
        )}
      </View>

      {schedule.tasks.length > 0 ? (
        <View style={styles.taskList}>
          {schedule.tasks.map((task) => (
            <View key={task.id} style={styles.taskItem}>
              <View style={styles.taskHeader}>
                {task.timeRange ? (
                  <View style={styles.taskTimeBadge}>
                    <Text style={styles.taskTimeText}>{task.timeRange}</Text>
                  </View>
                ) : null}
                <Text style={styles.taskTitle}>{task.title}</Text>
              </View>
              {task.description ? <Text style={styles.taskDescription}>{task.description}</Text> : null}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyTaskCard}>
          <Ionicons name="sparkles" size={18} color="#2EBD59" />
          <Text style={styles.emptyTaskTitle}>今天暂时没有待办</Text>
          <Text style={styles.emptyTaskSub}>{schedule.notes ?? '好好休息或者为下一班做轻松准备。'}</Text>
        </View>
      )}
    </View>
  );
}

function buildCalendarDays(monthDate: Date): CalendarDay[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const daysInMonth = lastDayOfMonth.getDate();
  const offsetFromMonday = (firstDayOfMonth.getDay() + 6) % 7; // Convert Sunday (0) to 6
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

function buildDaySchedule(key: string, date: Date, override?: Partial<DaySchedule>): DaySchedule {
  const base = BASE_SCHEDULE[key] ?? {};
  const shift = override?.shift ?? base.shift ?? 'off';
  const shiftConfig = SHIFT_CONFIG[shift];

  return {
    key,
    date,
    shift,
    shiftTime: override?.shiftTime ?? base.shiftTime ?? shiftConfig.defaultTime,
    colleagues: override?.colleagues ?? base.colleagues ?? deriveColleagues(date.getDate()),
    tasks: override?.tasks ?? base.tasks ?? deriveTasks(date),
    notes: override?.notes ?? base.notes,
  };
}

function deriveColleagues(day: number): string[] {
  const count = day % 4 === 0 ? 2 : 3;
  const startIndex = (day * 2) % COLLEAGUES.length;
  return Array.from({ length: count }, (_, idx) => COLLEAGUES[(startIndex + idx) % COLLEAGUES.length]);
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

function changeMonth(delta: number, setMonth: (value: Date) => void, setSelected: (key: string) => void) {
  setMonth((prev) => {
    const next = new Date(prev);
    next.setMonth(prev.getMonth() + delta);
    const key = formatDateKey(new Date(next.getFullYear(), next.getMonth(), 1));
    setSelected(key);
    return next;
  });
}

function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

function formatMonth(date: Date) {
  return `${date.getFullYear()}年${`${date.getMonth() + 1}`.padStart(2, '0')}月`;
}

function formatChineseDate(date: Date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatDayNumber(date: Date) {
  return `${date.getDate()}`.padStart(2, '0');
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseISO(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6FC',
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingBottom: 140,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  monthTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#18191F',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  weekdayLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 14,
    color: '#707070',
  },
  calendarGrid: {
    marginTop: 20,
  },
  calendarRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  dayCell: {
    width: `${100 / 7}%`,
    paddingHorizontal: 0,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dayInner: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outsideMonth: {
    backgroundColor: 'transparent',
  },
  outsideMonthText: {
    color: '#A0A3AD',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#18191F',
  },
  shiftBadge: {
    position: 'absolute',
    bottom: 6,
    fontSize: 10,
    fontWeight: '600',
  },
  taskCountPill: {
    position: 'absolute',
    top: 6,
    left: 6,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCountText: {
    fontSize: 10,
    fontWeight: '600',
  },
  selectedDay: {
    borderWidth: 2,
    borderRadius: 999,
  },
  offIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offIndicatorText: {
    fontSize: 10,
    fontWeight: '700',
  },
  detailsCard: {
    marginTop: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: '#B6BAC1',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E202A',
    marginBottom: 12,
  },
  shiftSummary: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  shiftSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  shiftOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftOptionActive: {
    borderWidth: 2,
  },
  shiftOptionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  shiftSummaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  colleagueWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  colleaguePill: {
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  colleagueText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#20212A',
  },
  emptyHint: {
    fontSize: 13,
    color: '#8A8D9A',
  },
  taskList: {
    gap: 12,
  },
  taskItem: {
    borderRadius: 16,
    backgroundColor: '#F7F8F9',
    padding: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  taskTimeBadge: {
    borderRadius: 10,
    backgroundColor: '#E8E4FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  taskTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5236EB',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2029',
  },
  taskDescription: {
    fontSize: 13,
    color: '#5A5C6B',
    lineHeight: 18,
  },
  emptyTaskCard: {
    marginTop: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(46, 189, 89, 0.08)',
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyTaskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#228B43',
  },
  emptyTaskSub: {
    fontSize: 13,
    color: '#3D6647',
    textAlign: 'center',
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    backgroundColor: '#111827',
    width: 64,
    height: 64,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
