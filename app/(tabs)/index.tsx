import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  SHIFT_CONFIG,
  SHIFT_OPTIONS,
  buildCalendarDays,
  buildDaySchedule,
  formatDateKey,
  type DaySchedule,
  type ShiftType,
} from '@/lib/schedule';
import { useSchedule } from '@/providers/schedule-provider';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

export default function HomeScreen() {
  const initialMonth = useMemo(() => new Date(2025, 8, 1), []); // 2025-09
  const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth);
  const [selectedDateKey, setSelectedDateKey] = useState<string>('2025-09-08');
  const { overrides, updateOverride, getScheduleForDate } = useSchedule();

  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  const scheduleByDay = useMemo(() => {
    const map: Record<string, DaySchedule> = {};

    calendarDays.forEach(({ key, date }) => {
      map[key] = buildDaySchedule(key, date, overrides[key]);
    });

    return map;
  }, [calendarDays, overrides]);

  const selectedSchedule = scheduleByDay[selectedDateKey] ?? getScheduleForDate(selectedDateKey);

  const monthLabel = useMemo(() => formatMonth(currentMonth), [currentMonth]);

  const calendarRows = useMemo(() => chunk(calendarDays, 7), [calendarDays]);

  const handleShiftChange = (shift: ShiftType) => {
    const config = SHIFT_CONFIG[shift];
    updateOverride(selectedDateKey, (prev) => ({
      ...(prev ?? {}),
      shift,
      shiftTime: shift === 'off' ? null : config.defaultTime,
    }));
  };

  const handleGoToToday = () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    setCurrentMonth(monthStart);
    setSelectedDateKey(formatDateKey(now));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <IconButton icon="chevron-back" onPress={() => changeMonth(-1, setCurrentMonth, setSelectedDateKey)} />
          <View style={styles.monthCluster}>
            <Text style={styles.monthTitle}>{monthLabel}</Text>
            <Pressable style={styles.todayButton} onPress={handleGoToToday}>
              <Text style={styles.todayButtonText}>今</Text>
            </Pressable>
          </View>
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
    </SafeAreaView>
  );
}

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

function changeMonth(delta: number, setMonth: Dispatch<SetStateAction<Date>>, setSelected: (key: string) => void) {
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
  monthCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  todayButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
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
});
