import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';

import { useRouter } from 'expo-router';

import {
  SHIFT_CONFIG,
  buildCalendarDays,
  type DaySchedule,
  type ShiftType,
} from '@/lib/schedule';
import { useSchedule } from '@/providers/schedule-provider';

const LINK_ITEMS = ['隐私政策', '服务条款', '关于我们'] as const;

const CONTENT_HORIZONTAL_PADDING = 24;
const GRID_COLUMNS = 2;
const GRID_MAX_CARD = 150;
const DEFAULT_GRID_GAP = 28;
const COMPACT_GRID_GAP = 20;

const SHIFT_CARD_SEQUENCE: ShiftType[] = ['early', 'mid', 'late', 'off'];

type ScheduleGetter = (key: string, date?: Date) => DaySchedule;

type ShiftCardStat = {
  key: ShiftType;
  title: string;
  count: number;
  workRatioLabel: string;
  monthRatioLabel: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

function buildShiftCardStats(getScheduleForDate: ScheduleGetter, referenceDate = new Date()): ShiftCardStat[] {
  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const calendarDays = buildCalendarDays(monthStart);
  const currentMonthDays = calendarDays.filter((day) => day.isCurrentMonth);

  const totalDaysInMonth = currentMonthDays.length;
  const counts: Record<ShiftType, number> = {
    early: 0,
    mid: 0,
    late: 0,
    off: 0,
  };

  currentMonthDays.forEach((day) => {
    const schedule = getScheduleForDate(day.key, day.date);
    counts[schedule.shift] += 1;
  });

  const totalWorkingDays = counts.early + counts.mid + counts.late;

  return SHIFT_CARD_SEQUENCE.map((shift) => {
    const config = SHIFT_CONFIG[shift];
    const count = counts[shift];
    const displayTitle = shift === 'off' ? '休息' : config.label;

    return {
      key: shift,
      title: displayTitle,
      count,
      workRatioLabel: `工作占比: ${formatPercent(count, totalWorkingDays)}`,
      monthRatioLabel: `总月占比: ${formatPercent(count, totalDaysInMonth)}`,
      backgroundColor: config.softBackground,
      borderColor: config.accent,
      textColor: config.textColor,
    };
  });
}

function formatPercent(value: number, total: number): string {
  if (total <= 0) {
    return '0%';
  }

  return `${Math.round((value / total) * 100)}%`;
}

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const { getScheduleForDate } = useSchedule();
  const router = useRouter();
  const shiftCards = useMemo(() => buildShiftCardStats(getScheduleForDate), [getScheduleForDate]);
  const cardCount = shiftCards.length;

  const contentPadding = CONTENT_HORIZONTAL_PADDING * 2;
  const availableWidth = Math.max(width - contentPadding, 0);
  const gap = availableWidth >= GRID_MAX_CARD * GRID_COLUMNS + DEFAULT_GRID_GAP
    ? DEFAULT_GRID_GAP
    : COMPACT_GRID_GAP;
  const totalGap = gap * (GRID_COLUMNS - 1);
  const rawCardSize = (availableWidth - totalGap) / GRID_COLUMNS;
  const normalizedCardSize = rawCardSize > 0 ? rawCardSize : availableWidth / GRID_COLUMNS;
  const cardSize = Math.min(GRID_MAX_CARD, normalizedCardSize);
  const gridWidth = cardSize > 0 ? cardSize * GRID_COLUMNS + totalGap : 0;
  const containerWidth = gridWidth > 0 ? Math.min(gridWidth, availableWidth) : undefined;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <Text style={styles.greeting}>Hi, David 👋</Text>
          <Text style={styles.subtitle}>Plan your calendar</Text>
        </View>

        <View style={styles.statisticsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>班次详细统计</Text>
            <Pressable hitSlop={8} onPress={() => router.push('/statistics')}>
              <Text style={styles.cardLink}>View all</Text>
            </Pressable>
          </View>

          <View
            style={[
              styles.shiftGrid,
              {
                alignSelf: 'center',
                justifyContent: 'flex-start',
                width: containerWidth,
              },
            ]}>
            {shiftCards.map((card, index) => {
              const isLastColumn = (index + 1) % GRID_COLUMNS === 0;
              const isLastRow = index >= cardCount - GRID_COLUMNS;

              return (
                <View
                  key={card.key}
                  style={[
                    styles.shiftCard,
                    {
                      width: cardSize,
                      flexBasis: cardSize,
                      maxWidth: cardSize,
                      marginRight: isLastColumn ? 0 : gap,
                      marginBottom: isLastRow ? 0 : gap,
                      backgroundColor: card.backgroundColor,
                      borderColor: card.borderColor,
                    },
                  ]}>
                  <Text style={[styles.shiftName, { color: card.textColor }]}>{card.title}</Text>
                  <Text style={[styles.shiftCount, { color: card.textColor }]}>{card.count}</Text>
                  <View style={[styles.shiftDivider, { backgroundColor: card.borderColor }]} />
                  <Text style={[styles.shiftMeta, { color: card.textColor }]}>{card.workRatioLabel}</Text>
                  <Text style={[styles.shiftMeta, { color: card.textColor }]}>{card.monthRatioLabel}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.simpleCard}>
          <Text style={styles.simpleCardTitle}>设置</Text>
        </View>

        <View style={styles.linksCard}>
          {LINK_ITEMS.map((item, index) => (
            <Text
              key={item}
              style={[styles.linkText, index > 0 && styles.linkSpacing]}>
              {item}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    gap: 28,
  },
  headerBlock: {
    gap: 12,
  },
  greeting: {
    fontSize: 30,
    fontWeight: '700',
    color: '#2F2F2F',
    fontFamily: Fonts.rounded,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#888888',
    letterSpacing: 0.5,
  },
  statisticsCard: {
    backgroundColor: 'rgba(217, 217, 217, 0.3)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(217, 217, 217, 0.5)',
    shadowColor: '#B1B6BF',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2F2F2F',
    fontFamily: Fonts.rounded,
  },
  cardLink: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888888',
  },
  shiftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  shiftCard: {
    borderRadius: 15,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  shiftName: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '400',
  },
  shiftCount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#000000',
  },
  shiftDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  shiftMeta: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '400',
  },
  simpleCard: {
    backgroundColor: 'rgba(217, 217, 217, 0.3)',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 18,
    shadowColor: '#B1B6BF',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  simpleCardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2F2F2F',
    fontFamily: Fonts.rounded,
  },
  linksCard: {
    backgroundColor: 'rgba(217, 217, 217, 0.3)',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 18,
    shadowColor: '#B1B6BF',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  linkText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2F2F2F',
  },
  linkSpacing: {
    marginTop: 13,
  },
});
