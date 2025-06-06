import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../database/database';
import { Note } from '../types/Note';
import { TaskWithNotes } from '../types/TaskNote';
import { taskNoteManager } from '../services/TaskNoteManager';
import { databaseManager } from '../database/database';
import { LinkedItemsList } from '../components/LinkedItemsList';
import { LinkTaskNoteModal } from '../components/LinkTaskNoteModal';
import { theme } from '../constants/theme';

interface TaskDetailScreenProps {
  route: {
    params: {
      taskId: number;
    };
  };
  navigation: any;
}

export const TaskDetailScreen: React.FC<TaskDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { taskId } = route.params;
  const [task, setTask] = useState<TaskWithNotes | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);

  useEffect(() => {
    loadTaskDetails();
  }, [taskId]);

  const loadTaskDetails = async () => {
    try {
      setLoading(true);
      const taskWithNotes = await taskNoteManager.getTaskWithNotes(taskId);
      setTask(taskWithNotes);
    } catch (error) {
      console.error('Failed to load task details:', error);
      Alert.alert('Error', 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async () => {
    if (!task) return;

    try {
      await databaseManager.toggleTaskComplete(taskId);
      await loadTaskDetails();
    } catch (error) {
      console.error('Failed to toggle task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleDeleteTask = async () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? This will also remove all links to notes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseManager.deleteTask(taskId);
              navigation.goBack();
            } catch (error) {
              console.error('Failed to delete task:', error);
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const handleNotePress = (note: Note) => {
    navigation.navigate('NoteEditor', { noteId: note.id });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Task not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Task Details</Text>
        
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleDeleteTask}
        >
          <Ionicons name="trash" size={24} color={theme.colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Task Information */}
        <View style={styles.taskCard}>
          <View style={styles.taskHeader}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={handleToggleComplete}
            >
              {task.completed ? (
                <Ionicons name="checkbox" size={24} color={theme.colors.success} />
              ) : (
                <Ionicons name="checkbox-outline" size={24} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
            
            <Text style={[styles.taskTitle, task.completed && styles.completedText]}>
              {task.title}
            </Text>
          </View>

          {task.description && (
            <Text style={[styles.taskDescription, task.completed && styles.completedText]}>
              {task.description}
            </Text>
          )}

          <View style={styles.taskMetadata}>
            <View style={styles.metadataRow}>
              <Ionicons name="calendar" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.metadataText}>
                Created: {new Date(task.createdAt).toLocaleDateString()}
              </Text>
            </View>
            
            {task.updatedAt !== task.createdAt && (
              <View style={styles.metadataRow}>
                <Ionicons name="time" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.metadataText}>
                  Updated: {new Date(task.updatedAt).toLocaleDateString()}
                </Text>
              </View>
            )}
            
            <View style={styles.metadataRow}>
              <Ionicons name="flag" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.metadataText}>
                Status: {task.completed ? 'Completed' : 'In Progress'}
              </Text>
            </View>
          </View>
        </View>

        {/* Linked Notes Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Linked Notes ({task.linkedNotes?.length || 0})
            </Text>
            
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => setShowLinkModal(true)}
            >
              <Ionicons name="link" size={20} color={theme.colors.primary} />
              <Text style={styles.linkButtonText}>Link Note</Text>
            </TouchableOpacity>
          </View>

          {task.linkedNotes && task.linkedNotes.length > 0 ? (
            <LinkedItemsList
              items={task.linkedNotes}
              type="notes"
              sourceId={taskId}
              sourceType="task"
              onItemPress={handleNotePress}
              onRefresh={loadTaskDetails}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyStateText}>No linked notes</Text>
              <Text style={styles.emptyStateSubtext}>
                Link notes to keep related information together
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <LinkTaskNoteModal
        visible={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        mode="linkTaskToNote"
        sourceItem={task}
        onLinkCreated={loadTaskDetails}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
  },
  taskCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  checkbox: {
    marginRight: theme.spacing.sm,
  },
  taskTitle: {
    flex: 1,
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  taskDescription: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  taskMetadata: {
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  metadataText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  section: {
    margin: theme.spacing.md,
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.borderRadius.md,
  },
  linkButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium as any,
    marginLeft: theme.spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyStateText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptyStateSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
  },
  backButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  backButtonText: {
    color: theme.colors.surface,
    fontWeight: theme.fontWeight.medium as any,
  },
});