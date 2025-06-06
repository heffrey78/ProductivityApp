import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme } from '../../constants/theme';
import { Tag, TAG_COLORS, TagColor } from '../../types/Tag';
import { tagManager } from '../../services/TagManager';

interface TagInputProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  placeholder?: string;
  maxTags?: number;
}

export const TagInput: React.FC<TagInputProps> = ({
  selectedTags,
  onTagsChange,
  placeholder = 'Add tags...',
  maxTags = 10,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newTagColor, setNewTagColor] = useState<TagColor>(TAG_COLORS[0]);

  useEffect(() => {
    loadAllTags();
  }, []);

  useEffect(() => {
    if (inputValue.trim()) {
      searchTags(inputValue);
    } else {
      setSuggestions([]);
    }
  }, [inputValue]);

  const loadAllTags = async () => {
    try {
      const tags = await tagManager.getAllTags();
      setAllTags(tags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const searchTags = async (query: string) => {
    try {
      const results = await tagManager.searchTags(query);
      const filteredResults = results.filter(
        tag => !selectedTags.some(selected => selected.id === tag.id)
      );
      setSuggestions(filteredResults);
    } catch (error) {
      console.error('Failed to search tags:', error);
    }
  };

  const handleAddTag = async (tag?: Tag) => {
    if (selectedTags.length >= maxTags) {
      alert(`Maximum ${maxTags} tags allowed`);
      return;
    }

    if (tag) {
      onTagsChange([...selectedTags, tag]);
      setInputValue('');
      setSuggestions([]);
    } else if (inputValue.trim()) {
      // Create new tag
      try {
        console.log('TagInput: Creating new tag:', { name: inputValue.trim(), color: newTagColor });
        const newTag = await tagManager.getOrCreateTag(inputValue.trim(), newTagColor);
        console.log('TagInput: Successfully created tag:', newTag);
        onTagsChange([...selectedTags, newTag]);
        setInputValue('');
        setSuggestions([]);
        await loadAllTags();
      } catch (error) {
        console.error('TagInput: Failed to create tag:', error);
        console.error('TagInput: Error details:', error instanceof Error ? error.message : String(error));
        alert(`Failed to create tag: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  const handleRemoveTag = (tagId: number) => {
    onTagsChange(selectedTags.filter(tag => tag.id !== tagId));
  };

  const renderTag = (tag: Tag) => (
    <TouchableOpacity
      key={tag.id}
      style={[styles.tag, { backgroundColor: tag.color }]}
      onPress={() => handleRemoveTag(tag.id)}
    >
      <Text style={styles.tagText}>{tag.name}</Text>
      <Text style={styles.tagRemove}>×</Text>
    </TouchableOpacity>
  );

  const renderSuggestion = ({ item }: { item: Tag }) => (
    <TouchableOpacity
      style={styles.suggestion}
      onPress={() => handleAddTag(item)}
    >
      <View style={[styles.suggestionColor, { backgroundColor: item.color }]} />
      <Text style={styles.suggestionText}>{item.name}</Text>
      <Text style={styles.suggestionCount}>{item.usage_count} uses</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.selectedTags}>
        {selectedTags.map(renderTag)}
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.placeholder}
          onSubmitEditing={() => handleAddTag()}
          returnKeyType="done"
        />
        {inputValue.trim() && !suggestions.some(s => s.name === inputValue.trim().toLowerCase()) && (
          <TouchableOpacity
            style={styles.colorButton}
            onPress={() => setShowColorPicker(true)}
          >
            <View style={[styles.colorPreview, { backgroundColor: newTagColor }]} />
          </TouchableOpacity>
        )}
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item.id.toString()}
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      <Modal
        visible={showColorPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowColorPicker(false)}
        >
          <View style={styles.colorPickerContainer}>
            <Text style={styles.colorPickerTitle}>Choose Tag Color</Text>
            <View style={styles.colorGrid}>
              {TAG_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    newTagColor === color && styles.selectedColor,
                  ]}
                  onPress={() => {
                    setNewTagColor(color);
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.sm,
  },
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  tagRemove: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.lg,
    marginLeft: theme.spacing.xs,
    fontWeight: theme.fontWeight.bold,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  colorButton: {
    marginLeft: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.full,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.medium,
    maxHeight: 200,
    zIndex: 1000,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  suggestionColor: {
    width: 16,
    height: 16,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
  },
  suggestionText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  suggestionCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPickerContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '80%',
    maxWidth: 300,
  },
  colorPickerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    margin: theme.spacing.xs,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: theme.colors.text,
  },
});