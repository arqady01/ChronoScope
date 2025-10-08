import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SHIFT_CONFIG, SHIFT_OPTIONS, type ShiftType } from '@/lib/schedule';

type ShiftSelectorProps = {
  value: ShiftType;
  onChange: (value: ShiftType) => void;
  disabled?: boolean;
};

function ShiftSelectorInner({ value, onChange, disabled = false }: ShiftSelectorProps) {
  return (
    <View style={[styles.container, disabled && styles.disabledContainer]}>
      {SHIFT_OPTIONS.map((option) => {
        const config = SHIFT_CONFIG[option];
        const isActive = value === option;

        return (
          <Pressable
            key={option}
            disabled={disabled}
            onPress={() => onChange(option)}
            style={[styles.option, { borderColor: config.textColor }, isActive && [styles.optionActive, { backgroundColor: config.softBackground, borderColor: config.accent }]]}>
            <Text style={[styles.optionLabel, { color: config.textColor }, isActive && { color: config.accent }]}>
              {option === 'off' ? '休息' : config.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const ShiftSelector = memo(ShiftSelectorInner);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  disabledContainer: {
    opacity: 0.5,
  },
  option: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: {
    borderWidth: 2,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
