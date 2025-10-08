import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const DEFAULT_DISABLED_MESSAGE = '休息日，不安排共事成员';
const DEFAULT_EMPTY_POOL_MESSAGE = '请先在“设置”中添加共事成员';
const DEFAULT_EMPTY_SELECTION_HINT = '今日由你独自值守';

export type ColleagueSelectorProps = {
  selected: string[];
  pool: string[];
  onChange: (names: string[]) => void;
  disabled?: boolean;
  title?: string;
  showHeader?: boolean;
  disabledMessage?: string;
  emptyPoolMessage?: string;
  emptySelectionHint?: string;
};

function ColleagueSelectorInner({
  selected,
  pool,
  onChange,
  disabled = false,
  title = '今日共事',
  showHeader = true,
  disabledMessage = DEFAULT_DISABLED_MESSAGE,
  emptyPoolMessage = DEFAULT_EMPTY_POOL_MESSAGE,
  emptySelectionHint = DEFAULT_EMPTY_SELECTION_HINT,
}: ColleagueSelectorProps) {
  const options = useMemo(() => {
    const uniqueSelected = Array.from(new Set(selected));
    const remaining = pool.filter((name) => !uniqueSelected.includes(name));
    return [...uniqueSelected, ...remaining];
  }, [selected, pool]);

  const handleToggle = (name: string) => {
    if (disabled) {
      return;
    }
    const exists = selected.includes(name);
    const next = exists ? selected.filter((item) => item !== name) : [...selected, name];
    onChange(next);
  };

  const handleClear = () => {
    if (disabled) {
      return;
    }
    onChange([]);
  };

  return (
    <View>
      {showHeader ? (
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{title}</Text>
          {!disabled && selected.length > 0 ? (
            <Pressable hitSlop={6} onPress={handleClear}>
              <Text style={styles.clearAction}>清空</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {disabled ? (
        <Text style={styles.hintText}>{disabledMessage}</Text>
      ) : options.length === 0 ? (
        <Text style={styles.hintText}>{emptyPoolMessage}</Text>
      ) : (
        <>
          <View style={styles.optionWrap}>
            {options.map((name) => {
              const isActive = selected.includes(name);
              return (
                <Pressable
                  key={name}
                  onPress={() => handleToggle(name)}
                  hitSlop={6}
                  style={[styles.optionChip, isActive && styles.optionChipActive]}>
                  <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {selected.length === 0 ? <Text style={styles.hintText}>{emptySelectionHint}</Text> : null}
        </>
      )}
    </View>
  );
}

export const ColleagueSelector = memo(ColleagueSelectorInner);

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E202A',
  },
  clearAction: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D64545',
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  optionChip: {
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(82, 54, 235, 0.16)',
  },
  optionChipActive: {
    backgroundColor: '#5236EB',
    borderColor: '#5236EB',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#20212A',
  },
  optionLabelActive: {
    color: '#FFFFFF',
  },
  hintText: {
    fontSize: 13,
    color: '#8A8D9A',
  },
});
