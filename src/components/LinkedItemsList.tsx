import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../database/database';
import { Note } from '../types/Note';
import { taskNoteManager } from '../services/TaskNoteManager';
import { theme } from '../constants/theme';

interface LinkedItemsListProps {
  items: (Task | Note)[];
  type: 'tasks' | 'notes';
  sourceId: number;
  sourceType: 'task' | 'note';
  onItemPress?: (item: any) => void;
  onRefresh: () => void;
}

export const LinkedItemsList: React.FC<LinkedItemsListProps> = ({
  items,
  type,
  sourceId,
  sourceType,
  onItemPress,
  onRefresh,
}) => {
  const handleUnlink = async (item: Task | Note) => {
    const itemTitle = item.title;
    const itemType = type === 'tasks' ? 'task' : 'note';
    
    Alert.alert(
      'Unlink Item',
      `Are you sure you want to unlink this ${itemType}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              if (sourceType === 'task') {
                // Unlinking note from task
                await taskNoteManager.unlinkTaskFromNote(sourceId, (item as Note).id);
              } else {
                // Unlinking task from note
                await taskNoteManager.unlinkTaskFromNote((item as Task).id!, sourceId);
              }
              
              Alert.alert('Success', `${itemType} unlinked successfully`);
              onRefresh();
            } catch (error) {
              console.error('Failed to unlink item:', error);
              Alert.alert('Error', `Failed to unlink ${itemType}`);
            }
          },
        },
      ]
    );
  };

  const isTask = (item: Task | Note): item is Task => {
    return 'completed' in item;
  };

  const renderItem = ({ item }: { item: Task | Note }) => {
    const isTaskItem = isTask(item);
    
    return (
      <View style={styles.itemContainer}>
        <TouchableOpacity
          style={styles.itemContent}
          onPress={() => onItemPress?.(item)}
        >
          <View style={styles.itemHeader}>
            <Ionicons 
              name={isTaskItem ? (item.completed ? 'checkbox' : 'checkbox-outline') : 'document-text'}
              size={20} 
              color={isTaskItem && item.completed ? theme.colors.success : theme.colors.primary}
            />
            <Text 
              style={[
                styles.itemTitle,
                isTaskItem && item.completed && styles.completedText
              ]} 
              numberOfLines={1}
            >
              {item.title}
            </Text>
          </View>
          
          {isTaskItem ? (
            item.description && (
              <Text style={[styles.itemDescription, item.completed && styles.completedText]} numberOfLines={2}>
                {item.description}
              </Text>
            )
          ) : (
            <Text style={styles.itemDescription} numberOfLines={2}>
              {(item as Note).content}
            </Text>
          )}
          
          <View style={styles.itemFooter}>
            <Text style={styles.itemDate}>
              {isTaskItem 
                ? new Date(item.createdAt).toLocaleDateString()
                : new Date((item as Note).created_at).toLocaleDateString()
              }
            </Text>
            
            {!isTaskItem && (item as Note).tags && (item as Note).tags!.length > 0 && (
              <View style={styles.tagsContainer}>
                {(item as Note).tags!.slice(0, 2).map(tag => (
                  <View key={tag.id} style={[styles.tag, { backgroundColor: tag.color + '20' }]}>
                    <Text style={[styles.tagText, { color: tag.color }]}>
                      {tag.name}
                    </Text>
                  </View>
                ))}
                {(item as Note).tags!.length > 2 && (
                  <Text style={styles.moreTagsText}>
                    +{(item as Note).tags!.length - 2}
                  </Text>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.unlinkButton}
          onPress={() => handleUnlink(item)}
        >
          <Ionicons name="unlink" size={18} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    );
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons 
          name={type === 'tasks' ? 'checkbox-outline' : 'document-outline'} 
          size={32} 
          color={theme.colors.textSecondary} 
        />
        <Text style={styles.emptyText}>
          No linked {type} yet
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => `${isTask(item) ? 'task' : 'note'}-${item.id || 0}`}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false} // Disable scroll since this is usually inside a ScrollView
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  itemContent: {
    flex: 1,
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
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  itemDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 18,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tag: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.xs,
  },
  tagText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium as any,
  },
  moreTagsText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  unlinkButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  separator: {
    height: theme.spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
});