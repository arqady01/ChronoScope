import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { SHIFT_CONFIG } from '@/lib/schedule';
import {
  aggregateMonthlyWorkRestDaysByYear,
  aggregateShiftTypeDistributionByYear,
} from '@/lib/statistics';
import { useSchedule } from '@/providers/schedule-provider';

const WORK_LINE_COLOR = '#FF8A00';
const REST_LINE_COLOR = SHIFT_CONFIG.off.accent;
const EARLY_BAR_COLOR = SHIFT_CONFIG.early.accent;
const MID_BAR_COLOR = SHIFT_CONFIG.mid.accent;
const LATE_BAR_COLOR = SHIFT_CONFIG.late.accent;

export default function StatisticsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { overrides, getScheduleForDate } = useSchedule();

  useEffect(() => {
    let isMounted = true;

    const lockOrientation = async () => {
      try {
        const { lockAsync, OrientationLock } = await import('expo-screen-orientation');
        if (!isMounted) {
          return;
        }
        await lockAsync(OrientationLock.LANDSCAPE);
      } catch (error) {
        console.warn('Failed to lock orientation', error);
      }
    };

    lockOrientation();

    return () => {
      isMounted = false;
      import('expo-screen-orientation')
        .then(({ lockAsync, OrientationLock }) => lockAsync(OrientationLock.PORTRAIT_UP))
        .catch(() => {
          // no-op if we fail to reset orientation
        });
    };
  }, []);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const seedYears = new Set<number>([currentYear, 2025]); // ensure charts show defaults before user edits

    Object.keys(overrides).forEach((key) => {
      const year = Number(key.slice(0, 4));
      if (!Number.isNaN(year)) {
        seedYears.add(year);
      }
    });

    return Array.from(seedYears).sort((a, b) => a - b);
  }, [overrides]);

  const fallbackYear = availableYears.length > 0 ? availableYears[availableYears.length - 1] : new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(fallbackYear);

  useEffect(() => {
    if (availableYears.length === 0) {
      return;
    }
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[availableYears.length - 1]);
    }
  }, [availableYears, selectedYear]);

  const monthlyWorkRest = useMemo(
    () => aggregateMonthlyWorkRestDaysByYear({ year: selectedYear, getScheduleForDate }),
    [selectedYear, getScheduleForDate],
  );

  const monthlyShiftDistribution = useMemo(
    () => aggregateShiftTypeDistributionByYear({ year: selectedYear, getScheduleForDate }),
    [selectedYear, getScheduleForDate],
  );

  const workLineData = monthlyWorkRest.map((stat) => ({ value: stat.workDays, label: `${stat.month}月` }));
  const restLineData = monthlyWorkRest.map((stat) => ({ value: stat.restDays, label: `${stat.month}月` }));
  const monthLabels = monthlyWorkRest.map((stat) => `${stat.month}月`);

  const stackedBarData = monthlyShiftDistribution.map((stat) => ({
    label: `${stat.month}月`,
    stacks: [
      { value: stat.early, color: EARLY_BAR_COLOR },
      { value: stat.mid, color: MID_BAR_COLOR },
      { value: stat.late, color: LATE_BAR_COLOR },
    ],
  }));

  const lineChartSpacing = 50;
  const dataPointCount = monthlyWorkRest.length;
  const containerWidth = Math.max(width - 48, 260);
  const lineChartContentWidth = dataPointCount > 1
    ? lineChartSpacing * (dataPointCount - 1) + lineChartSpacing
    : lineChartSpacing * 2;
  const lineChartWidth = lineChartContentWidth;
  const shouldScrollLineChart = lineChartWidth > containerWidth;
  const formatYAxisLabel = (label: string) => {
    const numeric = Number(label);
    if (Number.isNaN(numeric)) {
      return label;
    }
    return `${Math.round(numeric)}天`;
  };

  const lineChartMaxValue = Math.max(
    ...monthlyWorkRest.map((stat) => stat.workDays),
    ...monthlyWorkRest.map((stat) => stat.restDays),
    5,
  );
  const stackedBarMaxValue = Math.max(
    ...monthlyShiftDistribution.map((stat) => stat.early + stat.mid + stat.late),
    5,
  );

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color="#18191F" />
          </Pressable>
          <Text style={styles.screenTitle}>统计总览</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader
            title="月度工作 / 休息"
            description="查看全年每月的工作与休息情况变化。"
            controls={
              <YearSelector years={availableYears} value={selectedYear} onChange={setSelectedYear} />
            }
          />

          <View style={[styles.chartViewport, { width: containerWidth }]}>
            {shouldScrollLineChart ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEnabled
                contentContainerStyle={{ width: lineChartWidth }}>
                <LineChart
                  data={workLineData}
                  data2={restLineData}
                  height={240}
                  width={lineChartWidth}
                  spacing={lineChartSpacing}
                  initialSpacing={lineChartSpacing / 2}
                  endSpacing={lineChartSpacing / 2}
                  maxValue={lineChartMaxValue}
                  noOfSections={4}
                  showVerticalLines
                  verticalLinesColor="rgba(24, 25, 31, 0.06)"
                  verticalLinesStrokeDashArray={[3, 5]}
                  xAxisLabelTexts={monthLabels}
                  xAxisLabelTextStyle={styles.xAxisLabelText}
                  xAxisColor="rgba(24, 25, 31, 0.06)"
                  yAxisColor="rgba(24, 25, 31, 0.06)"
                  formatYLabel={formatYAxisLabel}
                  showDataPointsForMissingValues
                  color1={WORK_LINE_COLOR}
                  color2={REST_LINE_COLOR}
                  startFillColor="rgba(255, 138, 0, 0.28)"
                  endFillColor="rgba(255, 138, 0, 0.05)"
                  startOpacity={1}
                  endOpacity={0}
                  startFillColor2="rgba(46, 189, 89, 0.26)"
                  endFillColor2="rgba(46, 189, 0.05)"
                  startOpacity2={1}
                  endOpacity2={0}
                  areaChart
                  areaChart2
                  thickness={3}
                  thickness2={3}
                  hideDataPoints
                  hideDataPoints2
                  textColor="rgba(24, 25, 31, 0.55)"
                  textFontSize={12}
                  isAnimated
                />
              </ScrollView>
            ) : (
              <View style={[styles.chartStaticContainer, { width: containerWidth }]}>
                <LineChart
                  data={workLineData}
                  data2={restLineData}
                  height={240}
                  width={lineChartWidth}
                  spacing={lineChartSpacing}
                  initialSpacing={lineChartSpacing / 2}
                  endSpacing={lineChartSpacing / 2}
                  maxValue={lineChartMaxValue}
                  noOfSections={4}
                  showVerticalLines
                  verticalLinesColor="rgba(24, 25, 31, 0.06)"
                  verticalLinesStrokeDashArray={[3, 5]}
                  xAxisLabelTexts={monthLabels}
                  xAxisLabelTextStyle={styles.xAxisLabelText}
                  xAxisColor="rgba(24, 25, 31, 0.06)"
                  yAxisColor="rgba(24, 25, 31, 0.06)"
                  formatYLabel={formatYAxisLabel}
                  showDataPointsForMissingValues
                  color1={WORK_LINE_COLOR}
                  color2={REST_LINE_COLOR}
                  startFillColor="rgba(255, 138, 0, 0.28)"
                  endFillColor="rgba(255, 138, 0, 0.05)"
                  startOpacity={1}
                  endOpacity={0}
                  startFillColor2="rgba(46, 189, 89, 0.26)"
                  endFillColor2="rgba(46, 189, 0.05)"
                  startOpacity2={1}
                  endOpacity2={0}
                  areaChart
                  areaChart2
                  thickness={3}
                  thickness2={3}
                  hideDataPoints
                  hideDataPoints2
                  textColor="rgba(24, 25, 31, 0.55)"
                  textFontSize={12}
                  isAnimated
                />
              </View>
            )}
          </View>

          <Legend
            items={[
              { label: '工作日', color: WORK_LINE_COLOR },
              { label: '休息日', color: REST_LINE_COLOR },
            ]}
          />
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader
            title="班次类型分布"
            description="对比早班、中班、晚班在全年中的占比。"
            controls={
              <YearSelector years={availableYears} value={selectedYear} onChange={setSelectedYear} />
            }
          />

          <View style={styles.chartShift}>
            <BarChart
              stackData={stackedBarData}
              height={260}
              width={containerWidth}
              spacing={24}
              initialSpacing={12}
              barWidth={18}
              yAxisColor="rgba(24, 25, 31, 0.06)"
              yAxisThickness={1}
              xAxisColor="rgba(24, 25, 31, 0.06)"
              xAxisThickness={1}
              showVerticalLines
              verticalLinesColor="rgba(24, 25, 31, 0.08)"
              labelTextStyle={styles.axisLabel}
              xAxisLabelsHeight={32}
              hideYAxisText={false}
              formatYLabel={formatYAxisLabel}
              stackBorderRadius={8}
              maxValue={stackedBarMaxValue}
              noOfSections={4}
              showValuesAsTopLabel={false}
              isAnimated
            />
          </View>

          <Legend
            items={[
              { label: '早班', color: EARLY_BAR_COLOR },
              { label: '中班', color: MID_BAR_COLOR },
              { label: '晚班', color: LATE_BAR_COLOR },
            ]}
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

type SectionHeaderProps = {
  title: string;
  description: string;
  controls?: ReactNode;
};

function SectionHeader({ title, description, controls }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeadingText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionDescription}>{description}</Text>
      </View>
      {controls ? <View style={styles.sectionControls}>{controls}</View> : null}
    </View>
  );
}

type LegendProps = {
  items: { label: string; color: string }[];
};

function Legend({ items }: LegendProps) {
  return (
    <View style={styles.legendRow}>
      {items.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: item.color }]} />
          <Text style={styles.legendLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

type YearSelectorProps = {
  years: number[];
  value: number;
  onChange: (year: number) => void;
  compact?: boolean;
};

function YearSelector({ years, value, onChange, compact = false }: YearSelectorProps) {
  return (
    <View style={[styles.selectorRow, compact && styles.selectorRowCompact]}>
      {years.map((year) => {
        const isActive = year === value;
        return (
          <Pressable
            key={year}
            onPress={() => onChange(year)}
            style={[styles.selectorChip, isActive && styles.selectorChipActive]}>
            <Text style={[styles.selectorChipText, isActive && styles.selectorChipTextActive]}>{year}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6FC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 48,
    paddingTop: 16,
    gap: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  screenTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#18191F',
    fontFamily: Fonts.rounded,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionHeadingText: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#18191F',
    fontFamily: Fonts.sans,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  sectionControls: {
    flexShrink: 0,
    alignItems: 'flex-end',
    gap: 8,
  },
  selectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorRowCompact: {
    justifyContent: 'flex-end',
  },
  selectorChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  selectorChipActive: {
    backgroundColor: '#18191F',
  },
  selectorChipText: {
    fontSize: 13,
    color: '#4B5563',
  },
  selectorChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    color: '#374151',
  },
  chartViewport: {
    width: '100%',
    overflow: 'hidden',
  },
  chartStaticContainer: {
    width: '100%',
    alignItems: 'center',
  },
  chartShift: {
    marginLeft: 0,
  },
  xAxisLabelText: {
    textAlign: 'center',
  },
  axisLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
});
