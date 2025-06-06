import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../database/database';
import { Note } from '../types/Note';
import { databaseManager } from '../database/database';
import { noteManagerSQLite } from '../services/NoteManagerSQLite';
import { taskNoteManager } from '../services/TaskNoteManager';
import { theme } from '../constants/theme';

interface LinkTaskNoteModalProps {
  visible: boolean;
  onClose: () => void;
  mode: 'linkTaskToNote' | 'linkNoteToTask';
  sourceItem: Task | Note;
  onLinkCreated: () => void;
}

export const LinkTaskNoteModal: React.FC<LinkTaskNoteModalProps> = ({
  visible,
  onClose,
  mode,
  sourceItem,
  onLinkCreated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [availableItems, setAvailableItems] = useState<(Task | Note)[]>([]);
  const [filteredItems, setFilteredItems] = useState<(Task | Note)[]>([]);
  const [loading, setLoading] = useState(false);

  const isLinkingTaskToNote = mode === 'linkTaskToNote';
  const title = isLinkingTaskToNote ? 'Link Note to Task' : 'Link Task to Note';

  useEffect(() => {
    if (visible) {
      loadAvailableItems();
    }
  }, [visible, mode]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredItems(availableItems);
    } else {
      const filtered = availableItems.filter(item => {
        const searchText = searchQuery.toLowerCase();
        if (isTask(item)) {
          return item.title.toLowerCase().includes(searchText) ||
                 (item.description && item.description.toLowerCase().includes(searchText));
        } else {
          return item.title.toLowerCase().includes(searchText) ||
                 item.content.toLowerCase().includes(searchText);
        }
      });
      setFilteredItems(filtered);
    }
  }, [searchQuery, availableItems]);

  const loadAvailableItems = async () => {
    setLoading(true);
    try {
      if (isLinkingTaskToNote) {
        // Load available notes
        const notes = await noteManagerSQLite.getAllNotes();
        setAvailableItems(notes);
      } else {
        // Load available tasks
        const tasks = await databaseManager.getAllTasks();
        setAvailableItems(tasks);
      }
    } catch (error) {
      console.error('Failed to load items:', error);
      Alert.alert('Error', 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkItem = async (targetItem: Task | Note) => {
    try {
      if (isLinkingTaskToNote) {
        // Link note to task
        await taskNoteManager.linkTaskToNote({
          taskId: (sourceItem as Task).id!,
          noteId: (targetItem as Note).id,
        });
      } else {
        // Link task to note
        await taskNoteManager.linkTaskToNote({
          taskId: (targetItem as Task).id!,
          noteId: (sourceItem as Note).id,
        });
      }

      Alert.alert('Success', 'Link created successfully');
      onLinkCreated();
      onClose();
    } catch (error) {
      console.error('Failed to create link:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create link');
    }
  };

  const isTask = (item: Task | Note): item is Task => {
    return 'completed' in item;
  };

  const renderItem = ({ item }: { item: Task | Note }) => {
    const isTaskItem = isTask(item);
    
    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => handleLinkItem(item)}
      >
        <View style={styles.itemHeader}>
          <Ionicons 
            name={isTaskItem ? 'checkbox-outline' : 'document-text-outline'} 
            size={20} 
            color={theme.colors.primary} 
          />
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        
        {isTaskItem ? (
          item.description && (
            <Text style={styles.itemDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )
        ) : (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {(item as Note).content}
          </Text>
        )}
        
        <Text style={styles.itemDate}>
          {isTaskItem 
            ? new Date(item.createdAt).toLocaleDateString()
            : new Date((item as Note).created_at).toLocaleDateString()
          }
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.sourceItemContainer}>
          <Text style={styles.sourceLabel}>
            {isLinkingTaskToNote ? 'Task:' : 'Note:'}
          </Text>
          <Text style={styles.sourceTitle}>{sourceItem.title}</Text>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${isLinkingTaskToNote ? 'notes' : 'tasks'}...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <Text style={styles.sectionTitle}>
          Available {isLinkingTaskToNote ? 'Notes' : 'Tasks'}
        </Text>

        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => `${isTask(item) ? 'task' : 'note'}-${item.id || 0}`}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons 
                name={isLinkingTaskToNote ? 'document-outline' : 'checkbox-outline'} 
                size={48} 
                color={theme.colors.textSecondary} 
              />
              <Text style={styles.emptyText}>
                {loading 
                  ? 'Loading...' 
                  : `No ${isLinkingTaskToNote ? 'notes' : 'tasks'} found`
                }
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
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
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
  },
  placeholder: {
    width: 32,
  },
  sourceItemContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sourceLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  sourceTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.text,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: theme.spacing.lg,
  },
  itemContainer: {
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  itemTitle: {
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  itemDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 18,
  },
  itemDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
});