import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../database/database';
import { theme } from '../constants/theme';

interface TaskItemProps {
  task: Task;
  onToggleComplete: (id: number) => void;
  onDelete: (id: number) => void;
  onPress?: (task: Task) => void;
}

export default function TaskItem({ task, onToggleComplete, onDelete, onPress }: TaskItemProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.checkboxButton}
        onPress={() => task.id && onToggleComplete(task.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons 
          name={task.completed ? 'checkbox' : 'checkbox-outline'} 
          size={24} 
          color={task.completed ? theme.colors.success : theme.colors.primary} 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.taskContent}
        onPress={() => onPress?.(task)}
        activeOpacity={0.7}
      >
        <View style={styles.textContainer}>
          <Text style={[styles.title, task.completed && styles.completedText]}>
            {task.title}
          </Text>
          {task.description && (
            <Text style={[styles.description, task.completed && styles.completedText]}>
              {task.description}
            </Text>
          )}
          <View style={styles.metadata}>
            <Text style={styles.dateText}>
              {new Date(task.createdAt).toLocaleDateString()}
            </Text>
            <View style={[styles.statusBadge, task.completed && styles.completedBadge]}>
              <Text style={[styles.statusText, task.completed && styles.completedStatusText]}>
                {task.completed ? 'Completed' : 'In Progress'}
              </Text>
            </View>
          </View>
        </View>
        
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={theme.colors.textTertiary} 
          style={styles.chevron}
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => task.id && onDelete(task.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.components.card,
    marginVertical: theme.spacing.xs,
    marginHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  checkboxButton: {
    marginRight: theme.spacing.md,
    padding: theme.spacing.xs,
  },
  taskContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  description: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textTertiary,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primary + '20',
    borderRadius: theme.borderRadius.sm,
  },
  completedBadge: {
    backgroundColor: theme.colors.success + '20',
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium,
  },
  completedStatusText: {
    color: theme.colors.success,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  chevron: {
    marginLeft: theme.spacing.sm,
  },
  deleteButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
});