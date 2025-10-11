import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

import {
  SHIFT_CONFIG,
  buildCalendarDays,
  formatDateKey,
  type DaySchedule,
} from '@/lib/schedule';
import { useSchedule } from '@/providers/schedule-provider';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const PULL_THRESHOLD = 140;
const TIP_TRIGGER_DISTANCE = 70;
const TIP_DELAY = 2000;

export default function HomeScreen() {
  const router = useRouter();
  const initialMonth = useMemo(() => new Date(2025, 8, 1), []); // 2025-09
  const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth);
  const [selectedDateKey, setSelectedDateKey] = useState<string>('2025-09-08');
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [showReleaseTip, setShowReleaseTip] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const panY = useSharedValue(0);
  const backgroundScale = useSharedValue(1);
  const backgroundOpacity = useSharedValue(0);

  const { getScheduleForDate } = useSchedule();

  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  const scheduleByDay = useMemo(() => {
    const map: Record<string, DaySchedule> = {};

    calendarDays.forEach(({ key, date }) => {
      map[key] = getScheduleForDate(key, date);
    });

    return map;
  }, [calendarDays, getScheduleForDate]);

  const selectedSchedule = scheduleByDay[selectedDateKey] ?? getScheduleForDate(selectedDateKey);

  const monthLabel = useMemo(() => formatMonth(currentMonth), [currentMonth]);
  const calendarRows = useMemo(() => chunk(calendarDays, 7), [calendarDays]);

  const handleGoToToday = useCallback(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    setCurrentMonth(monthStart);
    setSelectedDateKey(formatDateKey(now));
  }, []);

  const disableScroll = useCallback(() => {
    setScrollEnabled(false);
  }, []);

  const enableScroll = useCallback(() => {
    setScrollEnabled(true);
  }, []);

  const startHoldTip = useCallback(() => {
    if (holdTimerRef.current) {
      return;
    }
    holdTimerRef.current = setTimeout(() => {
      setShowReleaseTip(true);
    }, TIP_DELAY);
  }, []);

  const resetHoldTip = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setShowReleaseTip(false);
  }, []);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  const navigateToEdit = useCallback(() => {
    router.push({ pathname: '/edit-date', params: { date: selectedDateKey } });
  }, [router, selectedDateKey]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          runOnJS(disableScroll)();
        })
        .onUpdate((event) => {
          const translation = event.translationY > 0 ? event.translationY : 0;
          panY.value = translation;

          // Calculate progress for visual effects
          const progress = Math.min(translation / PULL_THRESHOLD, 1);
          backgroundScale.value = 1 - progress * 0.05;
          backgroundOpacity.value = progress * 0.6;

          if (translation > TIP_TRIGGER_DISTANCE) {
            runOnJS(startHoldTip)();
          } else {
            runOnJS(resetHoldTip)();
          }
        })
        .onEnd(() => {
          runOnJS(enableScroll)();
          if (panY.value >= PULL_THRESHOLD) {
            // Animate out before navigation
            backgroundScale.value = withTiming(0.92, { duration: 300, easing: Easing.inOut(Easing.ease) });
            backgroundOpacity.value = withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) });
            panY.value = 0;
            runOnJS(resetHoldTip)();
            runOnJS(navigateToEdit)();
          } else {
            runOnJS(resetHoldTip)();
            panY.value = withSpring(0, { damping: 18, stiffness: 200 });
            backgroundScale.value = withSpring(1, { damping: 18, stiffness: 200 });
            backgroundOpacity.value = withTiming(0, { duration: 250 });
          }
        })
        .onFinalize(() => {
          runOnJS(enableScroll)();
          if (panY.value < PULL_THRESHOLD) {
            panY.value = withSpring(0, { damping: 18, stiffness: 200 });
            backgroundScale.value = withSpring(1, { damping: 18, stiffness: 200 });
            backgroundOpacity.value = withTiming(0, { duration: 250 });
          }
        }),
    [backgroundOpacity, backgroundScale, disableScroll, enableScroll, navigateToEdit, panY, resetHoldTip, startHoldTip],
  );

  const calendarAnimatedStyle = useAnimatedStyle(() => {
    const progress = Math.min(panY.value / PULL_THRESHOLD, 1);
    const scale = interpolate(progress, [0, 1], [1, 0.98], Extrapolation.CLAMP);
    const rotation = interpolate(progress, [0, 1], [0, -2], Extrapolation.CLAMP);

    return {
      transform: [
        { translateY: panY.value * 0.2 },
        { scale },
        { rotateZ: `${rotation}deg` as any },
      ] as any,
      opacity: interpolate(progress, [0, 0.8, 1], [1, 0.95, 0.9], Extrapolation.CLAMP),
    };
  });

  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    const progress = Math.min(panY.value / PULL_THRESHOLD, 1);
    const scale = interpolate(progress, [0, 0.5, 1], [0.95, 1.05, 1.1], Extrapolation.CLAMP);
    const rotation = interpolate(progress, [0, 1], [0, 3], Extrapolation.CLAMP);

    return {
      opacity: progress === 0 ? 0 : interpolate(progress, [0, 0.3, 1], [0, 0.8, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: panY.value * 0.3 },
        { scale },
        { rotateZ: `${rotation}deg` as any },
      ] as any,
    };
  });

  const backgroundAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
    transform: [{ scale: backgroundScale.value }] as any,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => {
    const progress = Math.min(panY.value / PULL_THRESHOLD, 1);
    const translateY = interpolate(progress, [0, 1], [0, 20], Extrapolation.CLAMP);
    const scale = interpolate(progress, [0, 1], [1, 0.96], Extrapolation.CLAMP);

    return {
      transform: [
        { translateY },
        { scale },
      ] as any,
    };
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Animated background blur overlay */}
      <Animated.View style={[styles.backgroundOverlay, backgroundAnimatedStyle]} pointerEvents="none">
        <BlurView intensity={40} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <ScrollView
        scrollEnabled={scrollEnabled}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Animated.View style={contentAnimatedStyle}>
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

          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.calendarSection, calendarAnimatedStyle]}>
              <Animated.View style={[styles.pullIndicator, indicatorAnimatedStyle]}>
                <View style={styles.pullIndicatorGlow} />
                <Text style={styles.pullIndicatorText}>
                  {showReleaseTip ? '松开进入编辑' : '下拉进入编辑'}
                </Text>
              </Animated.View>
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

            </Animated.View>
          </GestureDetector>

          <DayDetailsCard schedule={selectedSchedule} />
        </Animated.View>
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

function DayDetailsCard({ schedule }: { schedule: DaySchedule }) {
  const shiftConfig = SHIFT_CONFIG[schedule.shift];
  const dateLabel = formatChineseDate(schedule.date);
  const resolvedShiftLabel = schedule.shift === 'off'
    ? '休息日'
    : `${shiftConfig.label}${schedule.shiftTime ? ` ${schedule.shiftTime}` : shiftConfig.defaultTime ? ` ${shiftConfig.defaultTime}` : ''}`;
  const visibleTasks = schedule.tasks.filter((task) => task.title.trim().length > 0);

  return (
    <View style={styles.detailsCard}>
      <Text style={styles.sectionTitle}>{`班次信息 - ${dateLabel}`}</Text>

      <View style={[styles.shiftSummary, { backgroundColor: shiftConfig.softBackground }]}>
        <Text style={[styles.shiftSummaryText, { color: shiftConfig.textColor }]}>
          {resolvedShiftLabel}
        </Text>
      </View>

      <Text style={[styles.sectionTitle, styles.subSectionTitle]}>今日共事</Text>

      {schedule.shift === 'off' ? (
        <Text style={styles.emptyHint}>休息日，不安排共事成员</Text>
      ) : schedule.colleagues.length > 0 ? (
        <View style={styles.colleagueReadonlyWrap}>
          {schedule.colleagues.map((name) => (
            <View key={name} style={styles.colleagueBadge}>
              <Text style={styles.colleagueBadgeText}>{name}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyHint}>今日由你独自值守</Text>
      )}

      <Text style={[styles.sectionTitle, styles.subSectionTitle]}>今日待办</Text>
      {visibleTasks.length > 0 ? (
        <View style={styles.simpleTaskList}>
          {visibleTasks.map((task) => (
            <View key={task.id} style={styles.simpleTaskRow}>
              <Text style={styles.simpleTaskTitle}>{task.title}</Text>
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
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    zIndex: 999,
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
  calendarSection: {
    marginTop: 20,
    paddingTop: 22,
    position: 'relative',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  weekdayLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 14,
    color: '#707070',
  },
  calendarGrid: {
    marginTop: 0,
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
  pullIndicator: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    shadowColor: '#5236EB',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
    elevation: 5,
    overflow: 'hidden',
  },
  pullIndicatorGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: '#5236EB',
    opacity: 0.08,
    borderRadius: 999,
  },
  pullIndicatorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.3,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#1B1C24',
    marginBottom: 16,
  },
  subSectionTitle: {
    marginTop: 20,
    marginBottom: 12,
    fontSize: 16,
  },
  shiftSummary: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  shiftSummaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: 13,
    color: '#8A8D9A',
  },
  colleagueReadonlyWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colleagueBadge: {
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(82, 54, 235, 0.16)',
  },
  colleagueBadgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#20212A',
  },
  simpleTaskList: {
    marginTop: 16,
    gap: 10,
  },
  simpleTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#E1E4EA',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  simpleTaskTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2029',
  },
  emptyTaskCard: {
    marginTop: 24,
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
