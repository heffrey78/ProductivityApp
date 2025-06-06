import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { theme } from '../constants/theme';
import { noteManagerSQLite as noteManager } from '../services/NoteManagerSQLite';
import { tagManager } from '../services/TagManager';
import { Note } from '../types/Note';
import { Tag } from '../types/Tag';

type SortOption = 'updated' | 'created' | 'title' | 'wordCount';
type FilterOption = 'all' | 'favorites' | 'category' | 'tag';

const CATEGORIES = [
  { value: 'all', label: '📋 All Categories' },
  { value: 'general', label: '📝 General' },
  { value: 'personal', label: '👤 Personal' },
  { value: 'work', label: '💼 Work' },
  { value: 'ideas', label: '💡 Ideas' },
  { value: 'learning', label: '📚 Learning' },
];

export const NotesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => {
    initializeAndLoadNotes();
    loadTags();
  }, []);

  useEffect(() => {
    filterAndSortNotes();
  }, [notes, searchQuery, sortBy, filterBy, selectedCategory, selectedTag]);

  // Reload notes when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadNotes();
      loadTags();
    });

    return unsubscribe;
  }, [navigation]);

  const initializeAndLoadNotes = async () => {
    try {
      await noteManager.initialize();
      await tagManager.initialize();
      await loadNotes();
    } catch (error) {
      console.error('Failed to initialize notes:', error);
    }
  };

  const loadNotes = async () => {
    try {
      const allNotes = await noteManager.getAllNotes();
      setNotes(allNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  };

  const loadTags = async () => {
    try {
      const tags = await tagManager.getAllTags();
      setAllTags(tags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const filterAndSortNotes = () => {
    let filtered = [...notes];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.tags?.some(tag => tag.name.includes(query))
      );
    }

    // Apply category/tag/favorite filter
    switch (filterBy) {
      case 'favorites':
        filtered = filtered.filter(note => note.is_favorite);
        break;
      case 'category':
        if (selectedCategory !== 'all') {
          filtered = filtered.filter(note => note.category === selectedCategory);
        }
        break;
      case 'tag':
        if (selectedTag) {
          filtered = filtered.filter(note =>
            note.tags?.some(tag => tag.id === selectedTag.id)
          );
        }
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'wordCount':
          return b.word_count - a.word_count;
        default:
          return 0;
      }
    });

    setFilteredNotes(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotes();
    await loadTags();
    setRefreshing(false);
  };

  const getCategoryEmoji = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat ? cat.label.split(' ')[0] : '📝';
  };

  const renderNoteItem = ({ item }: { item: Note }) => (
    <TouchableOpacity
      style={styles.noteCard}
      onPress={() => navigation.navigate('NoteEditor', { noteId: item.id })}
    >
      <View style={styles.noteHeader}>
        <Text style={styles.noteTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {item.is_favorite && <Text style={styles.favoriteIcon}>⭐</Text>}
      </View>
      
      <Text style={styles.noteContent} numberOfLines={2}>
        {item.content}
      </Text>
      
      {item.tags && item.tags.length > 0 && (
        <View style={styles.tagContainer}>
          {item.tags.slice(0, 3).map(tag => (
            <View
              key={tag.id}
              style={[styles.tagBadge, { backgroundColor: tag.color }]}
            >
              <Text style={styles.tagText}>{tag.name}</Text>
            </View>
          ))}
          {item.tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{item.tags.length - 3}</Text>
          )}
        </View>
      )}
      
      <View style={styles.noteFooter}>
        <Text style={styles.noteCategory}>
          {getCategoryEmoji(item.category)} {item.category}
        </Text>
        <Text style={styles.noteDate}>
          {new Date(item.updated_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No notes found' : 'No notes yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? 'Try a different search term'
          : 'Tap the + button to create your first note'}
      </Text>
    </View>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowFilterModal(false)}
      >
        <View style={styles.filterModalContainer}>
          <Text style={styles.modalTitle}>Filter & Sort</Text>
          
          <Text style={styles.sectionTitle}>Sort By</Text>
          <View style={styles.optionsContainer}>
            {[
              { value: 'updated', label: 'Last Updated' },
              { value: 'created', label: 'Date Created' },
              { value: 'title', label: 'Title' },
              { value: 'wordCount', label: 'Word Count' },
            ].map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  sortBy === option.value && styles.selectedOption,
                ]}
                onPress={() => setSortBy(option.value as SortOption)}
              >
                <Text style={[
                  styles.optionText,
                  sortBy === option.value && styles.selectedOptionText,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Filter By</Text>
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                filterBy === 'all' && styles.selectedOption,
              ]}
              onPress={() => setFilterBy('all')}
            >
              <Text style={[
                styles.optionText,
                filterBy === 'all' && styles.selectedOptionText,
              ]}>
                All Notes
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.optionButton,
                filterBy === 'favorites' && styles.selectedOption,
              ]}
              onPress={() => setFilterBy('favorites')}
            >
              <Text style={[
                styles.optionText,
                filterBy === 'favorites' && styles.selectedOptionText,
              ]}>
                ⭐ Favorites
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryButton,
                  filterBy === 'category' && selectedCategory === cat.value && styles.selectedOption,
                ]}
                onPress={() => {
                  setFilterBy('category');
                  setSelectedCategory(cat.value);
                }}
              >
                <Text style={[
                  styles.optionText,
                  filterBy === 'category' && selectedCategory === cat.value && styles.selectedOptionText,
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>Tags</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {allTags.map(tag => (
              <TouchableOpacity
                key={tag.id}
                style={[
                  styles.tagFilterButton,
                  { backgroundColor: tag.color },
                  filterBy === 'tag' && selectedTag?.id === tag.id && styles.selectedTagFilter,
                ]}
                onPress={() => {
                  setFilterBy('tag');
                  setSelectedTag(tag);
                }}
              >
                <Text style={styles.tagFilterText}>{tag.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowFilterModal(false)}
          >
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes..."
          placeholderTextColor={theme.colors.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={styles.filterButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {filterBy !== 'all' && (
        <View style={styles.activeFilterContainer}>
          <Text style={styles.activeFilterText}>
            {filterBy === 'favorites' && '⭐ Favorites'}
            {filterBy === 'category' && `${getCategoryEmoji(selectedCategory)} ${selectedCategory}`}
            {filterBy === 'tag' && selectedTag && `🏷 ${selectedTag.name}`}
          </Text>
          <TouchableOpacity onPress={() => setFilterBy('all')}>
            <Text style={styles.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredNotes}
        renderItem={renderNoteItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={filteredNotes.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      
      <FloatingActionButton
        onPress={() => navigation.navigate('NoteEditor', { noteId: null })}
        icon="add"
      />

      {renderFilterModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
  filterButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  filterButtonText: {
    fontSize: theme.fontSize.xl,
  },
  activeFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary + '20',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  activeFilterText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium,
  },
  clearFilterText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
  noteCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.small,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  noteTitle: {
    flex: 1,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  favoriteIcon: {
    fontSize: theme.fontSize.md,
    marginLeft: theme.spacing.xs,
  },
  noteContent: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  tagBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.xs,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
  },
  moreTagsText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteCategory: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  noteDate: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textTertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyList: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.sm,
  },
  optionButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedOption: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  optionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  selectedOptionText: {
    color: '#FFFFFF',
  },
  categoryButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagFilterButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
    opacity: 0.8,
  },
  selectedTagFilter: {
    opacity: 1,
    borderWidth: 2,
    borderColor: theme.colors.text,
  },
  tagFilterText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  closeButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
});