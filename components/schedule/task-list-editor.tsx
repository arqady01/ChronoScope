import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { type Task } from '@/lib/schedule';

type TaskListEditorProps = {
  tasks: Task[];
  onRequestAdd: () => void;
  onRequestRemove: (taskId: string) => void;
  onTaskTitleChange: (taskId: string, title: string) => void;
};

export const TaskListEditor = memo(function TaskListEditor({
  tasks,
  onRequestAdd,
  onRequestRemove,
  onTaskTitleChange,
}: TaskListEditorProps) {
  return (
    <View style={styles.container}>
      {tasks.length === 0 ? (
        <Text style={styles.emptyHint}>暂未添加待办事项</Text>
      ) : (
        <View style={styles.list}>
          {tasks.map((task, index) => (
            <View key={task.id ?? `${index}`} style={styles.row}>
              <View style={styles.indexBadge}>
                <Text style={styles.indexText}>{index + 1}</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="输入待办事项"
                placeholderTextColor="#9CA3AF"
                value={task.title}
                onChangeText={(value) => onTaskTitleChange(task.id ?? `${index}`, value)}
                returnKeyType="done"
              />
              <Pressable
                style={styles.removeButton}
                onPress={() => onRequestRemove(task.id ?? `${index}`)}
                accessibilityRole="button"
                accessibilityLabel="删除待办事项"
              >
                <Ionicons name="close" size={18} color="#6B7280" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Pressable style={styles.addButton} onPress={onRequestAdd}>
        <Ionicons name="add" size={18} color="#FFFFFF" />
        <Text style={styles.addLabel}>添加待办</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  list: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(82, 54, 235, 0.08)',
  },
  indexText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5236EB',
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F4F6FC',
    fontSize: 15,
    color: '#111827',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF0F6',
  },
  emptyHint: {
    fontSize: 14,
    color: '#6B7280',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#5236EB',
  },
  addLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
