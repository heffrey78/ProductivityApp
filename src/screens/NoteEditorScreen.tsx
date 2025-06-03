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
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import Markdown from 'react-native-markdown-display';
import { RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../constants/theme';
import { noteManagerSQLite as noteManager } from '../services/NoteManagerSQLite';

type Props = StackScreenProps<RootStackParamList, 'NoteEditor'>;

export const NoteEditorScreen: React.FC<Props> = ({ route, navigation }) => {
  const { noteId } = route.params;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (noteId) {
      loadNote();
    }
  }, [noteId]);

  const loadNote = async () => {
    if (!noteId) return;
    
    try {
      const note = await noteManager.getNoteById(noteId);
      if (note) {
        setTitle(note.title);
        setContent(note.markdown_content);
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

    setIsLoading(true);
    try {
      if (noteId) {
        await noteManager.updateNote(noteId, {
          title: title.trim(),
          markdown_content: content,
          content: content, // For now, we'll store the same content
        });
      } else {
        await noteManager.createNote({
          title: title.trim(),
          content: content,
          markdown_content: content,
        });
      }
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save note:', error);
      Alert.alert('Error', 'Failed to save note');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => setShowPreview(!showPreview)}
        >
          <Text style={styles.toolbarButtonText}>
            {showPreview ? 'Edit' : 'Preview'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toolbarButton, isLoading && styles.disabledButton]} 
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.toolbarButtonText}>
            {isLoading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {!showPreview ? (
          <>
            <TextInput
              style={styles.titleInput}
              placeholder="Note title..."
              placeholderTextColor={theme.colors.placeholder}
              value={title}
              onChangeText={setTitle}
              autoFocus={!noteId}
            />
            <TextInput
              style={styles.contentInput}
              placeholder="Start writing..."
              placeholderTextColor={theme.colors.placeholder}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
          </>
        ) : (
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>{title || 'Untitled'}</Text>
            <Markdown 
              style={markdownStyles}
            >
              {content || '*No content*'}
            </Markdown>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const markdownStyles = {
  body: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    lineHeight: 24,
  },
  heading1: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold as any,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  heading2: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold as any,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  heading3: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold as any,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  paragraph: {
    marginBottom: theme.spacing.md,
  },
  link: {
    color: theme.colors.primary,
  },
  list_item: {
    marginBottom: theme.spacing.xs,
  },
  code_inline: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: theme.fontSize.md * 0.9,
  },
  code_block: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: theme.fontSize.md * 0.9,
  },
  blockquote: {
    backgroundColor: theme.colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    paddingLeft: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginVertical: theme.spacing.md,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  toolbarButton: {
    marginLeft: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary,
  },
  toolbarButtonText: {
    color: '#FFFFFF',
    fontWeight: theme.fontWeight.medium,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  titleInput: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  contentInput: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 24,
    minHeight: 300,
  },
  preview: {
    padding: theme.spacing.md,
  },
  previewTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  previewContent: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 24,
  },
  disabledButton: {
    opacity: 0.6,
  },
});