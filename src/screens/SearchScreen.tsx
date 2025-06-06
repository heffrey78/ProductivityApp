import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SectionList,
  SafeAreaView,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { noteManagerSQLite as noteManager } from '../services/NoteManagerSQLite';
import { databaseManager } from '../database/database';
import { tagManager } from '../services/TagManager';
import { Note } from '../types/Note';
import { Task } from '../database/database';
import { Tag } from '../types/Tag';

interface SearchResult {
  type: 'note' | 'task';
  item: Note | Task;
  matchedText?: string;
  score?: number;
}

interface SearchSection {
  title: string;
  data: SearchResult[];
}

interface SearchFilters {
  type: 'all' | 'notes' | 'tasks';
  categories: string[];
  tags: number[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  taskStatus: 'all' | 'completed' | 'active';
  sortBy: 'relevance' | 'date' | 'title';
  sortOrder: 'asc' | 'desc';
}

export const SearchScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchSection[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    type: 'all',
    categories: [],
    tags: [],
    dateRange: { start: null, end: null },
    taskStatus: 'all',
    sortBy: 'relevance',
    sortOrder: 'desc',
  });

  useEffect(() => {
    // Load recent searches from storage (you could implement this with AsyncStorage)
    loadRecentSearches();
    loadAvailableTags();
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      // Debounce search
      const timer = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchFilters]);

  const loadRecentSearches = () => {
    // For now, just use some mock data
    setRecentSearches(['markdown', 'todo', 'meeting notes', 'project']);
  };

  const loadAvailableTags = async () => {
    try {
      const tags = await tagManager.getAllTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const performSearch = async (query: string) => {
    setIsSearching(true);
    try {
      let noteSearchResults: SearchResult[] = [];
      let taskSearchResults: SearchResult[] = [];

      // Parse search query for advanced operators
      const parsedQuery = parseSearchQuery(query);

      // Search notes if not filtered out
      if (searchFilters.type === 'all' || searchFilters.type === 'notes') {
        let noteResults = await noteManager.searchNotes(parsedQuery.terms.join(' '));
        
        // Apply filters
        noteResults = applyNoteFilters(noteResults);
        
        noteSearchResults = noteResults.map(note => ({
          type: 'note' as const,
          item: note,
          matchedText: getMatchedText(note.content, query),
          score: calculateRelevanceScore(note, parsedQuery),
        }));
      }

      // Search tasks if not filtered out
      if (searchFilters.type === 'all' || searchFilters.type === 'tasks') {
        const allTasks = await databaseManager.getAllTasks();
        let taskResults = allTasks.filter(task => 
          matchesTaskQuery(task, parsedQuery)
        );
        
        // Apply filters
        taskResults = applyTaskFilters(taskResults);
        
        taskSearchResults = taskResults.map(task => ({
          type: 'task' as const,
          item: task,
          matchedText: getMatchedText(task.description || task.title, query),
          score: calculateTaskRelevanceScore(task, parsedQuery),
        }));
      }

      // Sort results
      const sortedNoteResults = sortResults(noteSearchResults);
      const sortedTaskResults = sortResults(taskSearchResults);

      // Organize results by type
      const sections: SearchSection[] = [];
      
      if (sortedNoteResults.length > 0) {
        sections.push({
          title: `Notes (${sortedNoteResults.length})`,
          data: sortedNoteResults,
        });
      }
      
      if (sortedTaskResults.length > 0) {
        sections.push({
          title: `Tasks (${sortedTaskResults.length})`,
          data: sortedTaskResults,
        });
      }

      setSearchResults(sections);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const parseSearchQuery = (query: string) => {
    const terms: string[] = [];
    const excludeTerms: string[] = [];
    const phrases: string[] = [];
    
    // Handle quoted phrases
    const phraseMatches = query.match(/"([^"]+)"/g);
    if (phraseMatches) {
      phraseMatches.forEach(phrase => {
        phrases.push(phrase.replace(/"/g, ''));
        query = query.replace(phrase, '');
      });
    }
    
    // Handle exclude terms (-term)
    const excludeMatches = query.match(/-\w+/g);
    if (excludeMatches) {
      excludeMatches.forEach(exclude => {
        excludeTerms.push(exclude.substring(1));
        query = query.replace(exclude, '');
      });
    }
    
    // Handle remaining terms
    const remainingTerms = query.trim().split(/\s+/).filter(term => term.length > 0);
    terms.push(...remainingTerms);
    
    return { terms, excludeTerms, phrases };
  };

  const applyNoteFilters = (notes: Note[]): Note[] => {
    return notes.filter(note => {
      // Category filter
      if (searchFilters.categories.length > 0 && !searchFilters.categories.includes(note.category)) {
        return false;
      }
      
      // Tag filter
      if (searchFilters.tags.length > 0) {
        const noteTagIds = note.tags?.map(tag => tag.id) || [];
        const hasMatchingTag = searchFilters.tags.some(tagId => noteTagIds.includes(tagId));
        if (!hasMatchingTag) return false;
      }
      
      // Date range filter
      if (searchFilters.dateRange.start || searchFilters.dateRange.end) {
        const noteDate = new Date(note.created_at);
        if (searchFilters.dateRange.start && noteDate < searchFilters.dateRange.start) return false;
        if (searchFilters.dateRange.end && noteDate > searchFilters.dateRange.end) return false;
      }
      
      return true;
    });
  };

  const applyTaskFilters = (tasks: Task[]): Task[] => {
    return tasks.filter(task => {
      // Task status filter
      if (searchFilters.taskStatus !== 'all') {
        if (searchFilters.taskStatus === 'completed' && !task.completed) return false;
        if (searchFilters.taskStatus === 'active' && task.completed) return false;
      }
      
      // Date range filter
      if (searchFilters.dateRange.start || searchFilters.dateRange.end) {
        const taskDate = new Date(task.createdAt);
        if (searchFilters.dateRange.start && taskDate < searchFilters.dateRange.start) return false;
        if (searchFilters.dateRange.end && taskDate > searchFilters.dateRange.end) return false;
      }
      
      return true;
    });
  };

  const matchesTaskQuery = (task: Task, parsedQuery: any): boolean => {
    const searchText = `${task.title} ${task.description || ''}`.toLowerCase();
    
    // Check if all terms are present
    const hasAllTerms = parsedQuery.terms.every((term: string) => 
      searchText.includes(term.toLowerCase())
    );
    
    // Check if no exclude terms are present
    const hasNoExcludeTerms = !parsedQuery.excludeTerms.some((term: string) => 
      searchText.includes(term.toLowerCase())
    );
    
    // Check if all phrases are present
    const hasAllPhrases = parsedQuery.phrases.every((phrase: string) => 
      searchText.includes(phrase.toLowerCase())
    );
    
    return hasAllTerms && hasNoExcludeTerms && hasAllPhrases;
  };

  const calculateRelevanceScore = (note: Note, parsedQuery: any): number => {
    let score = 0;
    const titleWeight = 3;
    const contentWeight = 1;
    const tagWeight = 2;
    
    const titleLower = note.title.toLowerCase();
    const contentLower = note.content.toLowerCase();
    
    // Score based on term matches
    parsedQuery.terms.forEach((term: string) => {
      const termLower = term.toLowerCase();
      if (titleLower.includes(termLower)) score += titleWeight;
      if (contentLower.includes(termLower)) score += contentWeight;
    });
    
    // Score based on tag matches
    if (note.tags) {
      note.tags.forEach(tag => {
        if (searchFilters.tags.includes(tag.id)) score += tagWeight;
      });
    }
    
    return score;
  };

  const calculateTaskRelevanceScore = (task: Task, parsedQuery: any): number => {
    let score = 0;
    const titleWeight = 3;
    const descriptionWeight = 1;
    
    const titleLower = task.title.toLowerCase();
    const descriptionLower = (task.description || '').toLowerCase();
    
    // Score based on term matches
    parsedQuery.terms.forEach((term: string) => {
      const termLower = term.toLowerCase();
      if (titleLower.includes(termLower)) score += titleWeight;
      if (descriptionLower.includes(termLower)) score += descriptionWeight;
    });
    
    return score;
  };

  const sortResults = (results: SearchResult[]): SearchResult[] => {
    return results.sort((a, b) => {
      switch (searchFilters.sortBy) {
        case 'relevance':
          const scoreA = a.score || 0;
          const scoreB = b.score || 0;
          return searchFilters.sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
        
        case 'date':
          const dateA = new Date(a.type === 'note' 
            ? (a.item as Note).created_at 
            : (a.item as Task).createdAt
          );
          const dateB = new Date(b.type === 'note' 
            ? (b.item as Note).created_at 
            : (b.item as Task).createdAt
          );
          return searchFilters.sortOrder === 'desc' 
            ? dateB.getTime() - dateA.getTime()
            : dateA.getTime() - dateB.getTime();
        
        case 'title':
          const titleA = a.item.title.toLowerCase();
          const titleB = b.item.title.toLowerCase();
          return searchFilters.sortOrder === 'desc' 
            ? titleB.localeCompare(titleA)
            : titleA.localeCompare(titleB);
        
        default:
          return 0;
      }
    });
  };

  const getMatchedText = (text: string, query: string): string => {
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text.substring(0, 50) + '...';
    
    const start = Math.max(0, index - 20);
    const end = Math.min(text.length, index + query.length + 30);
    
    let excerpt = text.substring(start, end);
    if (start > 0) excerpt = '...' + excerpt;
    if (end < text.length) excerpt = excerpt + '...';
    
    return excerpt;
  };

  const handleResultPress = (result: SearchResult) => {
    // Add to recent searches
    if (!recentSearches.includes(searchQuery)) {
      setRecentSearches([searchQuery, ...recentSearches.slice(0, 9)]);
    }

    if (result.type === 'note') {
      navigation.navigate('NoteEditor', { noteId: (result.item as Note).id });
    } else {
      navigation.navigate('TaskDetail', { taskId: (result.item as Task).id! });
    }
  };

  const resetFilters = () => {
    setSearchFilters({
      type: 'all',
      categories: [],
      tags: [],
      dateRange: { start: null, end: null },
      taskStatus: 'all',
      sortBy: 'relevance',
      sortOrder: 'desc',
    });
  };

  const hasActiveFilters = () => {
    return searchFilters.type !== 'all' ||
           searchFilters.categories.length > 0 ||
           searchFilters.tags.length > 0 ||
           searchFilters.dateRange.start !== null ||
           searchFilters.dateRange.end !== null ||
           searchFilters.taskStatus !== 'all' ||
           searchFilters.sortBy !== 'relevance';
  };

  const handleRecentSearchPress = (search: string) => {
    setSearchQuery(search);
  };

  const getCategoryEmoji = (category: string) => {
    const emojis: { [key: string]: string } = {
      general: '📝',
      personal: '👤',
      work: '💼',
      ideas: '💡',
      learning: '📚',
    };
    return emojis[category] || '📝';
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => {
    if (item.type === 'note') {
      const note = item.item as Note;
      return (
        <TouchableOpacity
          style={styles.resultItem}
          onPress={() => handleResultPress(item)}
        >
          <View style={styles.resultHeader}>
            <Text style={styles.resultType}>📝 Note</Text>
            <Text style={styles.resultCategory}>
              {getCategoryEmoji(note.category)} {note.category}
            </Text>
          </View>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {note.title}
          </Text>
          {item.matchedText && (
            <Text style={styles.resultExcerpt} numberOfLines={2}>
              {item.matchedText}
            </Text>
          )}
          {note.tags && note.tags.length > 0 && (
            <View style={styles.tagContainer}>
              {note.tags.slice(0, 3).map(tag => (
                <View
                  key={tag.id}
                  style={[styles.tagBadge, { backgroundColor: tag.color }]}
                >
                  <Text style={styles.tagText}>{tag.name}</Text>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>
      );
    } else {
      const task = item.item as Task;
      return (
        <TouchableOpacity
          style={styles.resultItem}
          onPress={() => handleResultPress(item)}
        >
          <View style={styles.resultHeader}>
            <Text style={styles.resultType}>✓ Task</Text>
            <Text style={[
              styles.taskStatus,
              task.completed && styles.completedTask
            ]}>
              {task.completed ? 'Completed' : 'Active'}
            </Text>
          </View>
          <Text style={[
            styles.resultTitle,
            task.completed && styles.completedTaskText
          ]} numberOfLines={1}>
            {task.title}
          </Text>
          {task.description && (
            <Text style={styles.resultExcerpt} numberOfLines={2}>
              {item.matchedText || task.description}
            </Text>
          )}
        </TouchableOpacity>
      );
    }
  };

  const renderSectionHeader = ({ section }: { section: SearchSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  const renderEmptyResults = () => (
    <View style={styles.emptyContainer}>
      {searchQuery.length > 1 ? (
        <>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>
            Try a different search term or check your spelling
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>Search Everything</Text>
          <Text style={styles.emptySubtitle}>
            Find notes and tasks quickly by searching for keywords
          </Text>
        </>
      )}
    </View>
  );

  const renderRecentSearches = () => (
    <View style={styles.recentContainer}>
      <Text style={styles.recentTitle}>Recent Searches</Text>
      <View style={styles.recentTags}>
        {recentSearches.map((search, index) => (
          <TouchableOpacity
            key={index}
            style={styles.recentTag}
            onPress={() => handleRecentSearchPress(search)}
          >
            <Text style={styles.recentTagText}>{search}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons 
            name="search" 
            size={20} 
            color={theme.colors.textSecondary} 
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes and tasks..."
            placeholderTextColor={theme.colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity
          style={[styles.filterButton, hasActiveFilters() && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons 
            name="options" 
            size={20} 
            color={hasActiveFilters() ? theme.colors.primary : theme.colors.textSecondary} 
          />
          {hasActiveFilters() && <View style={styles.filterIndicator} />}
        </TouchableOpacity>
      </View>

      {hasActiveFilters() && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFilters}>
            {searchFilters.type !== 'all' && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>Type: {searchFilters.type}</Text>
              </View>
            )}
            {searchFilters.categories.map(category => (
              <View key={category} style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>{category}</Text>
              </View>
            ))}
            {searchFilters.tags.map(tagId => {
              const tag = availableTags.find(t => t.id === tagId);
              return tag ? (
                <View key={tagId} style={[styles.activeFilterChip, { backgroundColor: tag.color + '20' }]}>
                  <Text style={[styles.activeFilterText, { color: tag.color }]}>{tag.name}</Text>
                </View>
              ) : null;
            })}
            {searchFilters.taskStatus !== 'all' && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>Status: {searchFilters.taskStatus}</Text>
              </View>
            )}
          </ScrollView>
          <TouchableOpacity onPress={resetFilters} style={styles.clearFiltersButton}>
            <Text style={styles.clearFiltersText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      {searchQuery.length <= 1 && recentSearches.length > 0 && renderRecentSearches()}

      {searchResults.length > 0 ? (
        <SectionList
          sections={searchResults}
          renderItem={renderSearchResult}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item, index) => `${item.type}-${index}`}
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : (
        searchQuery.length > 1 && !isSearching && renderEmptyResults()
      )}

      {isSearching && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Search Filters</Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.modalResetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Content Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Content Type</Text>
              <View style={styles.filterOptions}>
                {['all', 'notes', 'tasks'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterOption,
                      searchFilters.type === type && styles.filterOptionSelected
                    ]}
                    onPress={() => setSearchFilters({...searchFilters, type: type as any})}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      searchFilters.type === type && styles.filterOptionTextSelected
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Categories Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Categories</Text>
              <View style={styles.filterOptions}>
                {['general', 'personal', 'work', 'ideas', 'learning'].map(category => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.filterOption,
                      searchFilters.categories.includes(category) && styles.filterOptionSelected
                    ]}
                    onPress={() => {
                      const newCategories = searchFilters.categories.includes(category)
                        ? searchFilters.categories.filter(c => c !== category)
                        : [...searchFilters.categories, category];
                      setSearchFilters({...searchFilters, categories: newCategories});
                    }}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      searchFilters.categories.includes(category) && styles.filterOptionTextSelected
                    ]}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Tags Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Tags</Text>
              <View style={styles.filterOptions}>
                {availableTags.map(tag => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.filterOption,
                      { borderColor: tag.color },
                      searchFilters.tags.includes(tag.id) && { backgroundColor: tag.color + '20' }
                    ]}
                    onPress={() => {
                      const newTags = searchFilters.tags.includes(tag.id)
                        ? searchFilters.tags.filter(t => t !== tag.id)
                        : [...searchFilters.tags, tag.id];
                      setSearchFilters({...searchFilters, tags: newTags});
                    }}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      { color: searchFilters.tags.includes(tag.id) ? tag.color : theme.colors.text }
                    ]}>
                      {tag.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Task Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Task Status</Text>
              <View style={styles.filterOptions}>
                {['all', 'active', 'completed'].map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterOption,
                      searchFilters.taskStatus === status && styles.filterOptionSelected
                    ]}
                    onPress={() => setSearchFilters({...searchFilters, taskStatus: status as any})}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      searchFilters.taskStatus === status && styles.filterOptionTextSelected
                    ]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort Options */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.filterOptions}>
                {['relevance', 'date', 'title'].map(sortBy => (
                  <TouchableOpacity
                    key={sortBy}
                    style={[
                      styles.filterOption,
                      searchFilters.sortBy === sortBy && styles.filterOptionSelected
                    ]}
                    onPress={() => setSearchFilters({...searchFilters, sortBy: sortBy as any})}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      searchFilters.sortBy === sortBy && styles.filterOptionTextSelected
                    ]}>
                      {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.sortOrderContainer}>
                <Text style={styles.sortOrderLabel}>Sort Order:</Text>
                <Switch
                  value={searchFilters.sortOrder === 'desc'}
                  onValueChange={(value) => 
                    setSearchFilters({
                      ...searchFilters, 
                      sortOrder: value ? 'desc' : 'asc'
                    })
                  }
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
                  thumbColor={searchFilters.sortOrder === 'desc' ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text style={styles.sortOrderValue}>
                  {searchFilters.sortOrder === 'desc' ? 'Descending' : 'Ascending'}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.applyFiltersButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyFiltersText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  clearButton: {
    marginLeft: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  clearButtonText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
  },
  sectionHeader: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  resultItem: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.small,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  resultType: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  resultCategory: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  taskStatus: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  completedTask: {
    color: theme.colors.success,
  },
  resultTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  completedTaskText: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  resultExcerpt: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  tagContainer: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
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
  separator: {
    height: theme.spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
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
  loadingContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  recentContainer: {
    padding: theme.spacing.md,
  },
  recentTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  recentTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  recentTag: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recentTagText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  
  // Enhanced search interface styles
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  filterButton: {
    marginLeft: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary + '10',
  },
  filterIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  
  // Active filters styles
  activeFiltersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  activeFilters: {
    flex: 1,
  },
  activeFilterChip: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.xs,
  },
  activeFilterText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium,
  },
  clearFiltersButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  clearFiltersText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.error,
    fontWeight: theme.fontWeight.medium,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  modalCancelText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  modalResetText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.error,
    fontWeight: theme.fontWeight.medium,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  
  // Filter section styles
  filterSection: {
    marginTop: theme.spacing.lg,
  },
  filterSectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  filterOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  filterOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterOptionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  filterOptionTextSelected: {
    color: theme.colors.textInverse,
    fontWeight: theme.fontWeight.medium,
  },
  
  // Sort order styles
  sortOrderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  sortOrderLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginRight: theme.spacing.md,
  },
  sortOrderValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.md,
  },
  
  // Modal footer styles
  modalFooter: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  applyFiltersButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  applyFiltersText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textInverse,
    fontWeight: theme.fontWeight.semibold,
  },
});