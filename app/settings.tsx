import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TimerPickerModal } from 'react-native-timer-picker';

import { Fonts } from '@/constants/theme';
import {
  DEFAULT_COLLEAGUES,
  DEFAULT_SHIFT_TIMES,
  SHIFT_CONFIG,
  type ShiftTimeMap,
  type ShiftTimeRange,
  type ShiftType,
} from '@/lib/schedule';
import { useSchedule } from '@/providers/schedule-provider';

type EditableShift = Exclude<ShiftType, 'off'>;

type ShiftField = {
  key: EditableShift;
  label: string;
};

const EDITABLE_SHIFTS: ShiftField[] = [
  { key: 'early', label: SHIFT_CONFIG.early.label },
  { key: 'mid', label: SHIFT_CONFIG.mid.label },
  { key: 'late', label: SHIFT_CONFIG.late.label },
];

type ShiftDraftMap = Record<EditableShift, ShiftTimeRange>;

type PickerTarget = {
  shift: EditableShift;
  field: keyof ShiftTimeRange;
};

export default function SettingsScreen() {
  const {
    shiftTimes,
    setShiftTime,
    resetShiftTimes,
    colleaguePool,
    addColleague,
    updateColleague,
    removeColleague,
    resetColleagues,
  } = useSchedule();

  const [shiftDrafts, setShiftDrafts] = useState<ShiftDraftMap>(() => buildShiftDrafts(shiftTimes));
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [draftColleagues, setDraftColleagues] = useState(colleaguePool);
  const [newColleagueName, setNewColleagueName] = useState('');

  useEffect(() => {
    setShiftDrafts(buildShiftDrafts(shiftTimes));
  }, [shiftTimes]);

  useEffect(() => {
    setDraftColleagues(colleaguePool);
  }, [colleaguePool]);

  const canAddColleague = useMemo(() => newColleagueName.trim().length > 0, [newColleagueName]);

  const openTimePicker = (shift: EditableShift, field: keyof ShiftTimeRange) => {
    setPickerTarget({ shift, field });
  };

  const closeTimePicker = () => {
    setPickerTarget(null);
  };

  const pickerInitialValue = useMemo(() => {
    if (!pickerTarget) {
      return { hours: 0, minutes: 0 };
    }
    const range = shiftDrafts[pickerTarget.shift];
    const timeString = range?.[pickerTarget.field];
    return parseTimeString(timeString);
  }, [pickerTarget, shiftDrafts]);

  const pickerTitle = pickerTarget
    ? `${SHIFT_CONFIG[pickerTarget.shift].label}${pickerTarget.field === 'start' ? '开始时间' : '结束时间'}`
    : '';

  const handleColleagueBlur = (index: number) => {
    const currentValue = draftColleagues[index] ?? '';
    const trimmed = currentValue.trim();

    if (!trimmed) {
      removeColleague(index);
      setDraftColleagues((prev) => prev.filter((_, idx) => idx !== index));
      return;
    }

    setDraftColleagues((prev) => {
      const next = [...prev];
      next[index] = trimmed;
      return next;
    });
    updateColleague(index, trimmed);
  };

  const handleResetShiftTimes = () => {
    resetShiftTimes();
    setShiftDrafts(buildShiftDrafts(DEFAULT_SHIFT_TIMES));
  };

  const handleAddColleague = () => {
    if (!canAddColleague) {
      return;
    }

    const trimmed = newColleagueName.trim();
    addColleague(trimmed);
    setDraftColleagues((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setNewColleagueName('');
  };

  const handleTimeConfirm = ({ hours = 0, minutes = 0 }: { hours?: number; minutes?: number; seconds?: number }) => {
    if (!pickerTarget) {
      return;
    }

    const formatted = formatTimeValue(hours, minutes);
    const currentRange = shiftDrafts[pickerTarget.shift];
    const nextRange: ShiftTimeRange = {
      ...currentRange,
      [pickerTarget.field]: formatted,
    };

    setShiftDrafts((prev) => ({
      ...prev,
      [pickerTarget.shift]: nextRange,
    }));
    setShiftTime(pickerTarget.shift, nextRange);
    closeTimePicker();
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor="#F4F6FC" />
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>班次时间</Text>
            <Pressable hitSlop={8} onPress={handleResetShiftTimes}>
              <Text style={styles.sectionAction}>恢复默认</Text>
            </Pressable>
          </View>
          <Text style={styles.sectionDescription}>设置 早班 / 中班 / 晚班 在日历中的默认时间段。</Text>
          {EDITABLE_SHIFTS.map(({ key, label }) => (
            <View key={key} style={styles.shiftRow}>
              <Text style={styles.shiftLabel}>{label}</Text>
              <View style={styles.shiftTimeGroup}>
                <Pressable
                  style={styles.timeInput}
                  onPress={() => openTimePicker(key, 'start')}
                  hitSlop={6}>
                  <Text style={styles.timeInputText}>{shiftDrafts[key].start}</Text>
                </Pressable>
                <Text style={styles.timeSeparator}>至</Text>
                <Pressable
                  style={styles.timeInput}
                  onPress={() => openTimePicker(key, 'end')}
                  hitSlop={6}>
                  <Text style={styles.timeInputText}>{shiftDrafts[key].end}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>共事成员</Text>
            <Pressable
              hitSlop={8}
              onPress={() => {
                resetColleagues();
                setDraftColleagues([...DEFAULT_COLLEAGUES]);
              }}>
              <Text style={styles.sectionAction}>恢复默认</Text>
            </Pressable>
          </View>
          {draftColleagues.map((name, index) => (
            <View key={`colleague-${index}`} style={styles.colleagueRow}>
              <Text style={styles.colleagueIndex}>{index + 1}</Text>
              <TextInput
                value={name}
                onChangeText={(text) => {
                  setDraftColleagues((prev) => {
                    const next = [...prev];
                    next[index] = text;
                    return next;
                  });
                }}
                onBlur={() => handleColleagueBlur(index)}
                placeholder="输入姓名"
                placeholderTextColor="#B1B6BF"
                style={styles.colleagueInput}
              />
              <Pressable
                hitSlop={6}
                onPress={() => {
                  removeColleague(index);
                  setDraftColleagues((prev) => prev.filter((_, idx) => idx !== index));
                }}
                style={styles.removeButton}>
                <Text style={styles.removeButtonText}>移除</Text>
              </Pressable>
            </View>
          ))}

          <View style={styles.addRow}>
            <TextInput
              value={newColleagueName}
              onChangeText={setNewColleagueName}
              placeholder="添加新成员"
              placeholderTextColor="#B1B6BF"
              style={styles.addInput}
            />
            <Pressable
              style={[styles.addButton, canAddColleague ? styles.addButtonEnabled : styles.addButtonDisabled]}
              onPress={handleAddColleague}
              disabled={!canAddColleague}>
              <Text style={styles.addButtonText}>添加</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <TimerPickerModal
        visible={pickerTarget !== null}
        setIsVisible={(visible) => {
          if (!visible) {
            closeTimePicker();
          }
        }}
        onConfirm={handleTimeConfirm}
        onCancel={closeTimePicker}
        modalTitle={pickerTitle}
        hideSeconds
        hideDays
        initialValue={{ ...pickerInitialValue, seconds: 0 }}
        hourLabel="时"
        minuteLabel="分"
        confirmButtonText="确定"
        cancelButtonText="取消"
        closeOnOverlayPress
        LinearGradient={LinearGradient}
        styles={{
          theme: 'light',
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6FC',
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 40,
    paddingHorizontal: 20,
    gap: 24,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: '#B6BAC1',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E202A',
    fontFamily: Fonts.rounded,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D64545',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#61646F',
    lineHeight: 20,
  },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shiftLabel: {
    width: 50,
    fontSize: 16,
    fontWeight: '600',
    color: '#2F2F2F',
  },
  shiftTimeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeInputText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#18191F',
  },
  timeSeparator: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7A7C85',
  },
  colleagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colleagueIndex: {
    width: 22,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#A0A3AD',
  },
  colleagueInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: '#18191F',
    backgroundColor: '#F9FAFB',
  },
  removeButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 83, 73, 0.12)',
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D64545',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#18191F',
    backgroundColor: '#FFFFFF',
  },
  addButton: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  addButtonEnabled: {
    backgroundColor: '#5236EB',
  },
  addButtonDisabled: {
    backgroundColor: '#C6C7D5',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

function buildShiftDrafts(map: ShiftTimeMap): ShiftDraftMap {
  return EDITABLE_SHIFTS.reduce<ShiftDraftMap>((acc, { key }) => {
    acc[key] = ensureShiftRange(map[key], key);
    return acc;
  }, {} as ShiftDraftMap);
}

function ensureShiftRange(value: ShiftTimeRange | null | undefined, shift: EditableShift): ShiftTimeRange {
  if (value && value.start && value.end) {
    return { ...value };
  }

  const defaultRange = (DEFAULT_SHIFT_TIMES[shift] as ShiftTimeRange | null) ?? null;
  if (defaultRange && defaultRange.start && defaultRange.end) {
    return { ...defaultRange };
  }

  return parseDefaultFromConfig(shift);
}

function parseDefaultFromConfig(shift: EditableShift): ShiftTimeRange {
  const defaultTime = SHIFT_CONFIG[shift].defaultTime;
  if (defaultTime) {
    const [startRaw, endRaw] = defaultTime.split('-');
    const start = startRaw?.trim();
    const end = endRaw?.trim();
    if (start && end) {
      return { start, end };
    }
  }
  return { start: '00:00', end: '00:00' };
}

function parseTimeString(value?: string) {
  if (!value) {
    return { hours: 0, minutes: 0 };
  }
  const [hourRaw, minuteRaw] = value.split(':');
  const hours = Number.parseInt(hourRaw ?? '0', 10);
  const minutes = Number.parseInt(minuteRaw ?? '0', 10);
  return {
    hours: clamp(hours, 0, 23),
    minutes: clamp(minutes, 0, 59),
  };
}

function formatTimeValue(hours: number, minutes: number) {
  const safeHours = clamp(hours, 0, 23);
  const safeMinutes = clamp(minutes, 0, 59);
  return `${safeHours.toString().padStart(2, '0')}:${safeMinutes.toString().padStart(2, '0')}`;
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}
