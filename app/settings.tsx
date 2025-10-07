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
import { StatusBar } from 'expo-status-bar';

import { Fonts } from '@/constants/theme';
import { DEFAULT_COLLEAGUES, SHIFT_CONFIG, type ShiftType } from '@/lib/schedule';
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

type ShiftDraftMap = Record<EditableShift, string>;

export default function SettingsScreen() {
  const {
    shiftTimes,
    setShiftTime,
    colleaguePool,
    addColleague,
    updateColleague,
    removeColleague,
    resetColleagues,
  } = useSchedule();

  const [shiftDrafts, setShiftDrafts] = useState<ShiftDraftMap>(() =>
    EDITABLE_SHIFTS.reduce<ShiftDraftMap>((acc, { key }) => {
      acc[key] = shiftTimes[key] ?? '';
      return acc;
    }, { early: '', mid: '', late: '' }),
  );
  const [draftColleagues, setDraftColleagues] = useState(colleaguePool);
  const [newColleagueName, setNewColleagueName] = useState('');

  useEffect(() => {
    setShiftDrafts(
      EDITABLE_SHIFTS.reduce<ShiftDraftMap>((acc, { key }) => {
        acc[key] = shiftTimes[key] ?? '';
        return acc;
      }, { early: '', mid: '', late: '' }),
    );
  }, [shiftTimes]);

  useEffect(() => {
    setDraftColleagues(colleaguePool);
  }, [colleaguePool]);

  const canAddColleague = useMemo(() => newColleagueName.trim().length > 0, [newColleagueName]);

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
    EDITABLE_SHIFTS.forEach(({ key }) => {
      const defaultTime = SHIFT_CONFIG[key].defaultTime ?? '';
      setShiftTime(key, defaultTime);
    });
    setShiftDrafts(
      EDITABLE_SHIFTS.reduce<ShiftDraftMap>((acc, { key }) => {
        acc[key] = SHIFT_CONFIG[key].defaultTime ?? '';
        return acc;
      }, { early: '', mid: '', late: '' }),
    );
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

  return (
    <SafeAreaView style={styles.safeArea}>
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
              <TextInput
                value={shiftDrafts[key]}
                onChangeText={(text) =>
                  setShiftDrafts((prev) => ({
                    ...prev,
                    [key]: text,
                  }))
                }
                onBlur={() => {
                  const trimmed = shiftDrafts[key].trim();
                  setShiftDrafts((prev) => ({
                    ...prev,
                    [key]: trimmed,
                  }));
                  setShiftTime(key, trimmed);
                }}
                placeholder="例如 07:30 - 14:30"
                placeholderTextColor="#B1B6BF"
                style={styles.shiftInput}
              />
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
          <Text style={styles.sectionDescription}>更新可被排班的共事名单，日历将自动轮换这些名字。</Text>

          {draftColleagues.length === 0 ? (
            <Text style={styles.emptyHint}>当前列表为空，请添加至少一位共事成员。</Text>
          ) : (
            draftColleagues.map((name, index) => (
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
            ))
          )}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6FC',
  },
  contentContainer: {
    paddingTop: 24,
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
    color: '#5236EB',
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
  shiftInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(82, 54, 235, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#18191F',
    backgroundColor: '#F7F8FD',
  },
  emptyHint: {
    fontSize: 14,
    color: '#818499',
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
