import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { theme } from '../../constants/theme';

interface MarkdownEditorProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  isPreview: boolean;
}

interface FormatButton {
  label: string;
  prefix: string;
  suffix: string;
  placeholder?: string;
}

const formatButtons: FormatButton[] = [
  { label: 'B', prefix: '**', suffix: '**', placeholder: 'bold text' },
  { label: 'I', prefix: '*', suffix: '*', placeholder: 'italic text' },
  { label: 'H1', prefix: '# ', suffix: '', placeholder: 'Heading 1' },
  { label: 'H2', prefix: '## ', suffix: '', placeholder: 'Heading 2' },
  { label: 'H3', prefix: '### ', suffix: '', placeholder: 'Heading 3' },
  { label: '•', prefix: '- ', suffix: '', placeholder: 'List item' },
  { label: '1.', prefix: '1. ', suffix: '', placeholder: 'Numbered item' },
  { label: '[ ]', prefix: '- [ ] ', suffix: '', placeholder: 'Task item' },
  { label: '{ }', prefix: '`', suffix: '`', placeholder: 'code' },
  { label: 'Link', prefix: '[', suffix: '](url)', placeholder: 'link text' },
  { label: '>', prefix: '> ', suffix: '', placeholder: 'Quote' },
];

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start writing...',
  isPreview,
}) => {
  const inputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const insertFormatting = (format: FormatButton) => {
    const { start, end } = selection;
    const selectedText = value.substring(start, end);
    const hasSelection = start !== end;

    let newText = '';
    let newCursorPosition = start;

    if (hasSelection) {
      // Wrap selected text
      const before = value.substring(0, start);
      const after = value.substring(end);
      newText = `${before}${format.prefix}${selectedText}${format.suffix}${after}`;
      newCursorPosition = start + format.prefix.length + selectedText.length + format.suffix.length;
    } else {
      // Insert with placeholder
      const before = value.substring(0, start);
      const after = value.substring(start);
      const placeholder = format.placeholder || '';
      newText = `${before}${format.prefix}${placeholder}${format.suffix}${after}`;
      newCursorPosition = start + format.prefix.length;
      
      // Select the placeholder text
      setTimeout(() => {
        inputRef.current?.setNativeProps({
          selection: {
            start: newCursorPosition,
            end: newCursorPosition + placeholder.length,
          },
        });
      }, 50);
    }

    onChange(newText);
    
    // Restore focus to input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const renderToolbar = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.toolbar}
      keyboardShouldPersistTaps="handled"
    >
      {formatButtons.map((button, index) => (
        <TouchableOpacity
          key={index}
          style={styles.toolbarButton}
          onPress={() => insertFormatting(button)}
        >
          <Text style={[
            styles.toolbarButtonText,
            button.label === 'B' && { fontWeight: 'bold' },
            button.label === 'I' && { fontStyle: 'italic' },
          ]}>
            {button.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const markdownStyles = {
    body: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      lineHeight: 24,
    },
    heading1: {
      fontSize: theme.fontSize.xxl,
      fontWeight: theme.fontWeight.bold,
      marginVertical: theme.spacing.sm,
      color: theme.colors.text,
    },
    heading2: {
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.semibold,
      marginVertical: theme.spacing.sm,
      color: theme.colors.text,
    },
    heading3: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
      marginVertical: theme.spacing.xs,
      color: theme.colors.text,
    },
    paragraph: {
      marginVertical: theme.spacing.xs,
    },
    listItem: {
      marginVertical: theme.spacing.xs / 2,
    },
    code_inline: {
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.sm,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: theme.fontSize.sm,
    },
    code_block: {
      backgroundColor: theme.colors.background,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      marginVertical: theme.spacing.sm,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: theme.fontSize.sm,
    },
    blockquote: {
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
      paddingLeft: theme.spacing.md,
      marginVertical: theme.spacing.sm,
      opacity: 0.8,
    },
    link: {
      color: theme.colors.primary,
      textDecorationLine: 'underline' as const,
    },
    list_item: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
    },
    bullet_list_icon: {
      marginRight: theme.spacing.sm,
      lineHeight: 24,
    },
    ordered_list_icon: {
      marginRight: theme.spacing.sm,
      lineHeight: 24,
    },
  };

  if (isPreview) {
    return (
      <ScrollView style={styles.previewContainer}>
        <Markdown style={markdownStyles}>
          {value || '*No content to preview*'}
        </Markdown>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {!isPreview && renderToolbar()}
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.placeholder}
        multiline
        textAlignVertical="top"
        onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
        selection={selection}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    maxHeight: 44,
  },
  toolbarButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
  },
  toolbarButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.medium,
  },
  input: {
    flex: 1,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 24,
  },
  previewContainer: {
    flex: 1,
    padding: theme.spacing.md,
  },
});