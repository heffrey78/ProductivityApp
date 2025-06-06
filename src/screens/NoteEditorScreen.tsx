import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../constants/theme';
import { noteManagerSQLite as noteManager } from '../services/NoteManagerSQLite';
import { tagManager } from '../services/TagManager';
import { MarkdownEditor } from '../components/notes/MarkdownEditor';
import { TagInput } from '../components/notes/TagInput';
import { Tag } from '../types/Tag';
import { Note } from '../types/Note';
import { Task } from '../database/database';
import { taskNoteManager } from '../services/TaskNoteManager';
import { LinkedItemsList } from '../components/LinkedItemsList';
import { LinkTaskNoteModal } from '../components/LinkTaskNoteModal';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { RecordingPlayer } from '../components/RecordingPlayer';
import { Recording } from '../types/Recording';
import { recordingManager } from '../services/RecordingManager';

type Props = StackScreenProps<RootStackParamList, 'NoteEditor'>;

const CATEGORIES = [
  { value: 'general', label: '📝 General' },
  { value: 'personal', label: '👤 Personal' },
  { value: 'work', label: '💼 Work' },
  { value: 'ideas', label: '💡 Ideas' },
  { value: 'learning', label: '📚 Learning' },
];

export const NoteEditorScreen: React.FC<Props> = ({ route, navigation }) => {
  const { noteId } = route.params;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [category, setCategory] = useState('general');
  const [isFavorite, setIsFavorite] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [originalNote, setOriginalNote] = useState<Note | null>(null);
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showTaskActions, setShowTaskActions] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [attachedRecordings, setAttachedRecordings] = useState<Recording[]>([]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setIsFavorite(!isFavorite)}
          >
            <Text style={styles.headerButtonText}>
              {isFavorite ? '⭐' : '☆'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowPreview(!showPreview)}
          >
            <Text style={styles.headerButtonText}>
              {showPreview ? 'Edit' : 'Preview'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, styles.saveButton]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [showPreview, isFavorite, title, content, selectedTags, category]);

  useEffect(() => {
    console.log('NoteEditor: noteId changed to:', noteId);
    if (noteId) {
      loadNote();
      loadLinkedTasks();
      loadAttachedRecordings();
    }
  }, [noteId]);

  const loadNote = async () => {
    if (!noteId) return;
    
    try {
      console.log('NoteEditor: Loading note:', noteId);
      const note = await noteManager.getNoteById(noteId);
      if (note) {
        console.log('NoteEditor: Loaded note with tags:', { noteId, tags: note.tags });
        setOriginalNote(note);
        setTitle(note.title);
        setContent(note.markdown_content);
        setCategory(note.category);
        setIsFavorite(note.is_favorite);
        if (note.tags) {
          setSelectedTags(note.tags);
          console.log('NoteEditor: Set selected tags:', note.tags);
        } else {
          console.log('NoteEditor: No tags found for note');
          setSelectedTags([]);
        }
      }
    } catch (error) {
      console.error('Failed to load note:', error);
      Alert.alert('Error', 'Failed to load note');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    setIsLoading(true);

    try {
      const tagIds = selectedTags.map(tag => tag.id);
      console.log('NoteEditor: Saving note with tags:', { selectedTags, tagIds });

      if (noteId) {
        console.log('NoteEditor: Updating existing note:', noteId);
        await noteManager.updateNote(noteId, {
          title: title.trim(),
          markdown_content: content,
          category,
          is_favorite: isFavorite,
          tagIds,
        });
      } else {
        console.log('NoteEditor: Creating new note');
        await noteManager.createNote({
          title: title.trim(),
          markdown_content: content,
          category,
          is_favorite: isFavorite,
          tagIds,
        });
      }

      console.log('NoteEditor: Note saved successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save note - Full error details:', error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      Alert.alert('Error', `Failed to save note: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLinkedTasks = async () => {
    if (!noteId) return;
    
    try {
      const tasks = await taskNoteManager.getTasksForNote(noteId);
      setLinkedTasks(tasks);
    } catch (error) {
      console.error('Failed to load linked tasks:', error);
    }
  };

  const loadAttachedRecordings = async () => {
    if (!noteId) return;
    
    try {
      const recordings = await recordingManager.getRecordingsForNote(noteId);
      setAttachedRecordings(recordings);
    } catch (error) {
      console.error('Failed to load attached recordings:', error);
    }
  };

  const handleCreateTaskFromNote = async () => {
    if (!noteId || !originalNote) return;

    Alert.prompt(
      'Create Task',
      'Enter task title:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async (taskTitle) => {
            if (taskTitle && taskTitle.trim()) {
              try {
                await taskNoteManager.createTaskFromNote({
                  noteId,
                  title: taskTitle.trim(),
                  description: `Created from note: ${originalNote.title}`,
                });
                Alert.alert('Success', 'Task created and linked to note');
                await loadLinkedTasks();
              } catch (error) {
                console.error('Failed to create task:', error);
                Alert.alert('Error', 'Failed to create task');
              }
            }
          }
        }
      ]
    );
  };

  const handleBulkCreateTasks = async () => {
    if (!noteId) return;

    try {
      const tasks = await taskNoteManager.bulkCreateTasksFromNote(noteId);
      if (tasks.length > 0) {
        Alert.alert('Success', `Created ${tasks.length} task(s) from note content`);
        await loadLinkedTasks();
      } else {
        Alert.alert('Info', 'No action items found in note content');
      }
    } catch (error) {
      console.error('Failed to create tasks:', error);
      Alert.alert('Error', 'Failed to create tasks');
    }
  };

  const handleTaskPress = (task: Task) => {
    // Navigate to task detail if navigation is available
    if (navigation && task.id) {
      navigation.navigate('TaskDetail', { taskId: task.id });
    }
  };

  const handleVoiceRecordingComplete = async (recording: Recording) => {
    try {
      if (noteId) {
        await recordingManager.linkRecordingToNote(recording.id, noteId);
        console.log('Voice recording completed and linked to note:', recording.title);
        Alert.alert('Success', 'Voice recording saved successfully');
        await loadAttachedRecordings();
      }
    } catch (error) {
      console.error('Failed to attach recording to note:', error);
      Alert.alert('Error', 'Failed to attach recording to note');
    }
  };

  const handleRecordingDelete = async (recording: Recording) => {
    try {
      await recordingManager.deleteRecording(recording.id);
      await loadAttachedRecordings();
      Alert.alert('Success', 'Recording deleted successfully');
    } catch (error) {
      console.error('Failed to delete recording:', error);
      Alert.alert('Error', 'Failed to delete recording');
    }
  };

  const handleRecordingFavoriteToggle = async (recording: Recording) => {
    try {
      await recordingManager.updateRecording(recording.id, {
        is_favorite: !recording.is_favorite,
      });
      await loadAttachedRecordings();
    } catch (error) {
      console.error('Failed to update recording:', error);
      Alert.alert('Error', 'Failed to update recording');
    }
  };

  const getCategoryEmoji = (value: string) => {
    const cat = CATEGORIES.find(c => c.value === value);
    return cat ? cat.label.split(' ')[0] : '📝';
  };

  const renderCategoryPicker = () => (
    <Modal
      visible={showCategoryPicker}
      transparent
      animationType="fade"
      onRequestClose={() => setShowCategoryPicker(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowCategoryPicker(false)}
      >
        <View style={styles.categoryPickerContainer}>
          <Text style={styles.categoryPickerTitle}>Choose Category</Text>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryOption,
                category === cat.value && styles.selectedCategory,
              ]}
              onPress={() => {
                setCategory(cat.value);
                setShowCategoryPicker(false);
              }}
            >
              <Text style={styles.categoryOptionText}>{cat.label}</Text>
              {category === cat.value && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderTaskActionsModal = () => (
    <Modal
      visible={showTaskActions}
      transparent
      animationType="slide"
      onRequestClose={() => setShowTaskActions(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.taskActionsContainer}>
          <Text style={styles.taskActionsTitle}>Create Tasks</Text>
          
          <TouchableOpacity
            style={styles.taskActionOption}
            onPress={() => {
              setShowTaskActions(false);
              handleCreateTaskFromNote();
            }}
          >
            <Text style={styles.taskActionOptionIcon}>➕</Text>
            <View style={styles.taskActionOptionText}>
              <Text style={styles.taskActionOptionTitle}>Create Custom Task</Text>
              <Text style={styles.taskActionOptionSubtitle}>
                Create a new task with custom title and description
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.taskActionOption}
            onPress={() => {
              setShowTaskActions(false);
              handleBulkCreateTasks();
            }}
          >
            <Text style={styles.taskActionOptionIcon}>🔍</Text>
            <View style={styles.taskActionOptionText}>
              <Text style={styles.taskActionOptionTitle}>Extract Action Items</Text>
              <Text style={styles.taskActionOptionSubtitle}>
                Automatically find and create tasks from checkboxes and TODO items
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowTaskActions(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (showPreview) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.previewContainer}>
          <Text style={styles.previewTitle}>{title || 'Untitled'}</Text>
          <View style={styles.metadataContainer}>
            <Text style={styles.categoryBadge}>
              {getCategoryEmoji(category)} {category}
            </Text>
            {isFavorite && <Text style={styles.favoriteBadge}>⭐ Favorite</Text>}
          </View>
          {selectedTags.length > 0 && (
            <View style={styles.tagContainer}>
              {selectedTags.map(tag => (
                <View
                  key={tag.id}
                  style={[styles.tagBadge, { backgroundColor: tag.color }]}
                >
                  <Text style={styles.tagBadgeText}>{tag.name}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.divider} />
          <MarkdownEditor
            value={content}
            onChange={() => {}}
            isPreview={true}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView style={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.titleInput}
          placeholder="Note title..."
          placeholderTextColor={theme.colors.placeholder}
          value={title}
          onChangeText={setTitle}
          returnKeyType="next"
        />
        
        <TouchableOpacity
          style={styles.categorySelector}
          onPress={() => setShowCategoryPicker(true)}
        >
          <Text style={styles.categorySelectorText}>
            {getCategoryEmoji(category)} {category}
          </Text>
          <Text style={styles.categorySelectorArrow}>▼</Text>
        </TouchableOpacity>

        <TagInput
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
          placeholder="Add tags..."
          maxTags={10}
        />

        <View style={styles.editorContainer}>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            placeholder="Start writing your note..."
            isPreview={false}
          />
        </View>

        {/* Linked Tasks Section - Only show for existing notes */}
        {noteId && (
          <View style={styles.linkedTasksSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Linked Tasks ({linkedTasks.length})
              </Text>
              
              <View style={styles.taskActionButtons}>
                <TouchableOpacity
                  style={styles.taskActionButton}
                  onPress={() => setShowLinkModal(true)}
                >
                  <Text style={styles.taskActionButtonText}>Link</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.taskActionButton}
                  onPress={() => setShowTaskActions(true)}
                >
                  <Text style={styles.taskActionButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>

            {linkedTasks.length > 0 ? (
              <LinkedItemsList
                items={linkedTasks}
                type="tasks"
                sourceId={noteId}
                sourceType="note"
                onItemPress={handleTaskPress}
                onRefresh={loadLinkedTasks}
              />
            ) : (
              <View style={styles.emptyTasksContainer}>
                <Text style={styles.emptyTasksText}>No linked tasks</Text>
                <Text style={styles.emptyTasksSubtext}>
                  Link existing tasks or create new ones from your note content
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Voice Recordings Section - Show for existing notes, or suggest saving for new notes */}
        {(
          <View style={styles.recordingsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Voice Recordings {noteId ? `(${attachedRecordings.length})` : ''}
              </Text>
              
              {noteId ? (
                <TouchableOpacity
                  style={styles.recordingActionButton}
                  onPress={() => setShowVoiceRecorder(true)}
                >
                  <Text style={styles.recordingActionButtonText}>Record</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.savePromptButton}>
                  <Text style={styles.savePromptButtonText}>Save note first</Text>
                </View>
              )}
            </View>

            {noteId ? (
              attachedRecordings.length > 0 ? (
                <View style={styles.recordingsList}>
                  {attachedRecordings.map((recording) => (
                    <RecordingPlayer
                      key={recording.id}
                      recording={recording}
                      onDelete={() => handleRecordingDelete(recording)}
                      onFavoriteToggle={() => handleRecordingFavoriteToggle(recording)}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyRecordingsContainer}>
                  <Text style={styles.emptyRecordingsText}>No voice recordings</Text>
                  <Text style={styles.emptyRecordingsSubtext}>
                    Add voice memos and audio notes to enhance your documentation
                  </Text>
                </View>
              )
            ) : (
              <View style={styles.emptyRecordingsContainer}>
                <Text style={styles.emptyRecordingsText}>Voice recordings will appear here</Text>
                <Text style={styles.emptyRecordingsSubtext}>
                  Save your note first, then you can add voice recordings to enhance your documentation
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {renderCategoryPicker()}
      {renderTaskActionsModal()}
      
      {originalNote && (
        <LinkTaskNoteModal
          visible={showLinkModal}
          onClose={() => setShowLinkModal(false)}
          mode="linkNoteToTask"
          sourceItem={originalNote}
          onLinkCreated={loadLinkedTasks}
        />
      )}

      <VoiceRecorder
        visible={showVoiceRecorder}
        onClose={() => setShowVoiceRecorder(false)}
        onRecordingComplete={handleVoiceRecordingComplete}
        initialTitle={`Recording for ${title || 'Note'}`}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  headerButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: theme.fontWeight.medium,
  },
  titleInput: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categorySelectorText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  categorySelectorArrow: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  editorContainer: {
    flex: 1,
    minHeight: 300,
    backgroundColor: theme.colors.surface,
    marginTop: theme.spacing.sm,
  },
  previewContainer: {
    flex: 1,
    padding: theme.spacing.md,
  },
  previewTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  metadataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  categoryBadge: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.md,
  },
  favoriteBadge: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.warning,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
  },
  tagBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  tagBadgeText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPickerContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '80%',
    maxWidth: 300,
  },
  categoryPickerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  selectedCategory: {
    backgroundColor: theme.colors.background,
  },
  categoryOptionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  checkmark: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  linkedTasksSection: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  taskActionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  taskActionButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
  },
  taskActionButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.surface,
    fontWeight: theme.fontWeight.medium,
  },
  emptyTasksContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyTasksText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  emptyTasksSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  taskActionsContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxHeight: '50%',
  },
  taskActionsTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  taskActionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
  },
  taskActionOptionIcon: {
    fontSize: theme.fontSize.xl,
    marginRight: theme.spacing.md,
  },
  taskActionOptionText: {
    flex: 1,
  },
  taskActionOptionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  taskActionOptionSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  cancelButton: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.error,
    fontWeight: theme.fontWeight.medium,
  },
  recordingsSection: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  recordingActionButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.sm,
  },
  recordingActionButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.surface,
    fontWeight: theme.fontWeight.medium,
  },
  recordingsList: {
    gap: theme.spacing.md,
  },
  emptyRecordingsContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyRecordingsText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  emptyRecordingsSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  savePromptButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.textSecondary,
    borderRadius: theme.borderRadius.sm,
    opacity: 0.6,
  },
  savePromptButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.surface,
    fontWeight: theme.fontWeight.medium,
  },
});