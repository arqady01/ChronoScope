import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ColleagueSelector } from '@/components/schedule/colleague-selector';
import { ShiftSelector } from '@/components/schedule/shift-selector';
import {
  SHIFT_CONFIG,
  formatDateKey,
  formatShiftTimeRange,
  type DaySchedule,
  type ShiftTimeMap,
  type ShiftType,
} from '@/lib/schedule';
import { useSchedule } from '@/providers/schedule-provider';

const DISMISS_THRESHOLD = 140;
const HANDLE_HEIGHT = 12;

export default function EditDateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const rawKey = params.date;
  const resolvedKey = useMemo(() => {
    if (Array.isArray(rawKey)) {
      return rawKey[0];
    }
    if (typeof rawKey === 'string' && rawKey.trim().length > 0) {
      return rawKey;
    }
    return formatDateKey(new Date());
  }, [rawKey]);

  const { getScheduleForDate, updateOverride, shiftTimes, colleaguePool } = useSchedule();
  const snapshot: DaySchedule = useMemo(() => getScheduleForDate(resolvedKey), [getScheduleForDate, resolvedKey]);

  const [shift, setShift] = useState<ShiftType>(snapshot.shift);
  const [shiftSummaryTime, setShiftSummaryTime] = useState<string | null>(snapshot.shiftTime ?? null);
  const [selectedColleagues, setSelectedColleagues] = useState<string[]>(snapshot.colleagues);

  const closingRef = useRef(false);
  const translationY = useSharedValue(0);
  const sheetOpacity = useSharedValue(1);
  const entryTranslate = useSharedValue(70);
  const entryScale = useSharedValue(0.92);
  const entryOpacity = useSharedValue(0);

  useEffect(() => {
    setShift(snapshot.shift);
    setShiftSummaryTime(snapshot.shiftTime ?? computeDefaultTime(snapshot.shift, shiftTimes));
    setSelectedColleagues(snapshot.colleagues);
  }, [snapshot.key, snapshot.shift, snapshot.shiftTime, snapshot.colleagues, shiftTimes]);

  useEffect(() => {
    if (shift === 'off' && selectedColleagues.length > 0) {
      setSelectedColleagues([]);
    }
  }, [shift, selectedColleagues]);

  useEffect(() => {
    entryTranslate.value = withSpring(0, { damping: 16, stiffness: 200 });
    entryScale.value = withSpring(1, { damping: 16, stiffness: 220 });
    entryOpacity.value = withTiming(1, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
  }, [entryOpacity, entryScale, entryTranslate]);

  const dismiss = useCallback(() => {
    router.back();
  }, [router]);

  const triggerClose = useCallback(() => {
    if (closingRef.current) {
      return;
    }
    closingRef.current = true;
    sheetOpacity.value = withTiming(0, {
      duration: 220,
      easing: Easing.in(Easing.cubic),
    });
    translationY.value = withTiming(0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
    entryTranslate.value = withTiming(120, {
      duration: 260,
      easing: Easing.in(Easing.quad),
    });
    entryScale.value = withTiming(0.94, {
      duration: 260,
      easing: Easing.inOut(Easing.ease),
    });
    entryOpacity.value = withTiming(0, {
      duration: 220,
      easing: Easing.in(Easing.quad),
    }, (finished) => {
      if (finished) {
        runOnJS(dismiss)();
      }
    });
  }, [dismiss, entryOpacity, entryScale, entryTranslate, sheetOpacity, translationY]);

  const cancelChanges = useCallback(() => {
    triggerClose();
  }, [triggerClose]);

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .onUpdate((event) => {
        if (event.translationY <= 0) {
          translationY.value = 0;
          return;
        }
        translationY.value = event.translationY;
        const progress = Math.min(event.translationY / DISMISS_THRESHOLD, 1);
        sheetOpacity.value = 1 - progress * 0.35;
      })
      .onEnd(() => {
        if (translationY.value > DISMISS_THRESHOLD) {
          runOnJS(triggerClose)();
          return;
        }
        translationY.value = withSpring(0, { damping: 18, stiffness: 160 });
        sheetOpacity.value = withTiming(1, { duration: 180 });
      })
      .onFinalize(() => {
        if (translationY.value <= DISMISS_THRESHOLD) {
          translationY.value = withSpring(0, { damping: 18, stiffness: 160 });
          sheetOpacity.value = withTiming(1, { duration: 180 });
        }
      });
  }, [sheetOpacity, translationY, triggerClose]);

  const containerStyle = useAnimatedStyle(() => {
    const dragProgress = Math.min(translationY.value / DISMISS_THRESHOLD, 1);
    const baseScale = entryScale.value;
    const scaled = interpolate(dragProgress, [0, 1], [baseScale, baseScale - 0.05], Extrapolation.CLAMP);

    return {
      transform: [
        { translateY: translationY.value + entryTranslate.value },
        { scale: Math.max(scaled, 0.88) },
      ],
      opacity: sheetOpacity.value * entryOpacity.value,
    };
  });

  const handleShiftChange = useCallback(
    (nextShift: ShiftType) => {
      if (nextShift === shift) {
        return;
      }
      setShift(nextShift);
      const nextTime = nextShift === 'off'
        ? null
        : snapshot.shift === nextShift && snapshot.shiftTime
          ? snapshot.shiftTime
          : computeDefaultTime(nextShift, shiftTimes);
      setShiftSummaryTime(nextTime);
      if (nextShift === 'off') {
        setSelectedColleagues([]);
      }
    },
    [shift, snapshot.shift, snapshot.shiftTime, shiftTimes],
  );

  const handleSave = useCallback(() => {
    const normalizedColleagues = shift === 'off' ? [] : Array.from(new Set(selectedColleagues));
    const normalizedTime = shift === 'off' ? null : shiftSummaryTime;

    updateOverride(resolvedKey, (prev) => ({
      ...(prev ?? {}),
      shift,
      shiftTime: normalizedTime,
      colleagues: normalizedColleagues,
    }));

    triggerClose();
  }, [resolvedKey, selectedColleagues, shift, shiftSummaryTime, triggerClose, updateOverride]);

  const formattedDateLabel = useMemo(() => formatFullDate(snapshot.date), [snapshot.date]);
  const summaryLabel = useMemo(() => {
    const config = SHIFT_CONFIG[shift];
    if (shift === 'off') {
      return config.label;
    }
    const timeLabel = shiftSummaryTime ?? computeDefaultTime(shift, shiftTimes);
    return timeLabel ? `${config.label} ${timeLabel}` : config.label;
  }, [shift, shiftSummaryTime, shiftTimes]);

  const isDirty = useMemo(() => {
    const initialColleagues = snapshot.colleagues.join('|');
    const currentColleagues = selectedColleagues.join('|');
    return (
      snapshot.shift !== shift ||
      (snapshot.shiftTime ?? null) !== (shiftSummaryTime ?? null) ||
      initialColleagues !== currentColleagues
    );
  }, [selectedColleagues, shift, shiftSummaryTime, snapshot.colleagues, snapshot.shift, snapshot.shiftTime]);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.root, containerStyle]}>
        <Stack.Screen
          options={{
            headerShown: false,
            animation: 'slide_from_bottom',
            presentation: 'transparentModal',
          }}
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.pageTitle}>编辑排班</Text>
            <Text style={styles.dateLabel}>{formattedDateLabel}</Text>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>班次调整</Text>
              <ShiftSelector value={shift} onChange={handleShiftChange} />
              <View style={[styles.shiftSummary, { backgroundColor: SHIFT_CONFIG[shift].softBackground }]}>
                <Text style={[styles.shiftSummaryText, { color: SHIFT_CONFIG[shift].textColor }]}>
                  {summaryLabel}
                </Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>共事成员</Text>
                {shift !== 'off' && selectedColleagues.length > 0 ? (
                  <Pressable hitSlop={6} onPress={() => setSelectedColleagues([])}>
                    <Text style={styles.clearAction}>清空</Text>
                  </Pressable>
                ) : null}
              </View>
              <ColleagueSelector
                selected={selectedColleagues}
                pool={colleaguePool}
                onChange={setSelectedColleagues}
                disabled={shift === 'off'}
                showHeader={false}
              />
            </View>
          </ScrollView>

          <View style={styles.footerActions}>
            <Pressable style={styles.cancelButton} onPress={cancelChanges}>
              <Text style={styles.cancelLabel}>取消</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, !isDirty && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!isDirty}>
              <Text style={styles.saveLabel}>保存</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Animated.View>
    </GestureDetector>
  );
}

function computeDefaultTime(shift: ShiftType, shiftTimes: ShiftTimeMap) {
  if (shift === 'off') {
    return null;
  }
  const custom = formatShiftTimeRange(shiftTimes[shift]);
  return custom ?? SHIFT_CONFIG[shift].defaultTime ?? null;
}

function formatFullDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const weekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const weekday = weekdayNames[(date.getDay() + 6) % 7];
  return `${year}年${month}月${day}日 · ${weekday}`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F6FC',
  },
  safeArea: {
    flex: 1,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: HANDLE_HEIGHT,
    paddingBottom: 8,
  },
  dragHandle: {
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E202A',
  },
  dateLabel: {
    marginTop: 6,
    fontSize: 14,
    color: '#5A5C6B',
  },
  sectionCard: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 20,
    shadowColor: '#B6BAC1',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E202A',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearAction: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D64545',
  },
  shiftSummary: {
    marginTop: 4,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  shiftSummaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E202A',
  },
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5236EB',
    shadowColor: '#5236EB',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(82, 54, 235, 0.3)',
    shadowOpacity: 0,
  },
  saveLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
