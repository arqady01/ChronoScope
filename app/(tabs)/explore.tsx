import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';

const SHIFT_CARDS = [
  {
    key: 'early',
    title: '早班',
    count: '8',
    workRatio: '工作占比: 32%',
    monthRatio: '总月占比: 27%',
    backgroundColor: 'rgba(255, 165, 0, 0.3)',
    borderColor: 'rgba(255, 165, 0, 0.8)',
  },
  {
    key: 'mid',
    title: '中班',
    count: '12',
    workRatio: '工作占比: 48%',
    monthRatio: '总月占比: 40%',
    backgroundColor: 'rgba(109, 41, 246, 0.3)',
    borderColor: 'rgba(109, 41, 246, 0.8)',
  },
  {
    key: 'late',
    title: '晚班',
    count: '5',
    workRatio: '工作占比: 20%',
    monthRatio: '总月占比: 17%',
    backgroundColor: 'rgba(20, 107, 194, 0.3)',
    borderColor: 'rgba(20, 107, 194, 0.8)',
  },
  {
    key: 'rest',
    title: '休息',
    count: '5',
    workRatio: '工作占比: 20%',
    monthRatio: '总月占比: 17%',
    backgroundColor: 'rgba(60, 186, 46, 0.3)',
    borderColor: 'rgba(60, 186, 46, 0.8)',
  },
] as const;

const LINK_ITEMS = ['隐私政策', '服务条款', '关于我们'] as const;

const CONTENT_HORIZONTAL_PADDING = 24;
const GRID_COLUMNS = 2;
const GRID_MAX_CARD = 150;
const DEFAULT_GRID_GAP = 28;
const COMPACT_GRID_GAP = 20;

export default function ProfileScreen() {
  const { width } = useWindowDimensions();

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
            <Text style={styles.cardLink}>View all</Text>
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
            {SHIFT_CARDS.map((card, index) => {
              const isLastColumn = (index + 1) % GRID_COLUMNS === 0;
              const isLastRow = index >= SHIFT_CARDS.length - GRID_COLUMNS;

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
                  <Text style={styles.shiftName}>{card.title}</Text>
                  <Text style={styles.shiftCount}>{card.count}</Text>
                  <View style={styles.shiftDivider} />
                  <Text style={styles.shiftMeta}>{card.workRatio}</Text>
                  <Text style={styles.shiftMeta}>{card.monthRatio}</Text>
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
