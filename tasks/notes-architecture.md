# Notes System Technical Architecture

## 🏛️ System Overview

The notes system extends the existing ProductivityApp architecture with markdown-compatible notes, tagging, search, and task integration while maintaining the established patterns and cross-platform compatibility.

## 📦 Database Architecture

### Schema Design

The notes system extends the existing SQLite database with four new tables:

```sql
-- Core notes table
CREATE TABLE notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,           -- Rendered/plain text for search
  markdown_content TEXT NOT NULL,  -- Raw markdown for editing
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  category TEXT DEFAULT 'general',
  is_favorite BOOLEAN DEFAULT FALSE,
  word_count INTEGER DEFAULT 0,
  char_count INTEGER DEFAULT 0
);

-- Tags for categorization
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#007AFF',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  usage_count INTEGER DEFAULT 0
);

-- Many-to-many: Notes can have multiple tags
CREATE TABLE note_tags (
  note_id INTEGER,
  tag_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Many-to-many: Tasks can link to multiple notes
CREATE TABLE task_notes (
  task_id INTEGER,
  note_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, note_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);

-- Full-text search index
CREATE VIRTUAL TABLE notes_search USING fts5(
  note_id UNINDEXED,
  title,
  content,
  tags,
  tokenize = 'porter'
);

-- Indexes for performance
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX idx_notes_updated_at ON notes(updated_at DESC);
CREATE INDEX idx_notes_category ON notes(category);
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_usage ON tags(usage_count DESC);
```

### Database Migration Strategy

```typescript
// src/database/migrations/003_add_notes_system.ts
export const migration003 = {
  version: 3,
  name: 'add_notes_system',
  up: async (db: SQLiteDatabase) => {
    // Create tables in dependency order
    await db.execAsync(`CREATE TABLE IF NOT EXISTS notes (...)`);
    await db.execAsync(`CREATE TABLE IF NOT EXISTS tags (...)`);
    await db.execAsync(`CREATE TABLE IF NOT EXISTS note_tags (...)`);
    await db.execAsync(`CREATE TABLE IF NOT EXISTS task_notes (...)`);
    
    // Create FTS table
    await db.execAsync(`CREATE VIRTUAL TABLE IF NOT EXISTS notes_search (...)`);
    
    // Create indexes
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_notes_created_at (...)`);
    // ... other indexes
  },
  down: async (db: SQLiteDatabase) => {
    await db.execAsync(`DROP INDEX IF EXISTS idx_notes_created_at`);
    await db.execAsync(`DROP TABLE IF EXISTS notes_search`);
    await db.execAsync(`DROP TABLE IF EXISTS task_notes`);
    await db.execAsync(`DROP TABLE IF EXISTS note_tags`);
    await db.execAsync(`DROP TABLE IF EXISTS tags`);
    await db.execAsync(`DROP TABLE IF EXISTS notes`);
  }
};
```

## 🏗️ Service Layer Architecture

### Core Services

```typescript
// src/services/NoteManager.ts
export class NoteManager {
  constructor(private db: DatabaseManager) {}

  async createNote(noteData: CreateNoteRequest): Promise<Note> {
    // 1. Validate and sanitize input
    // 2. Process markdown content
    // 3. Insert note into database
    // 4. Update search index
    // 5. Handle tags if provided
    // 6. Return created note with full data
  }

  async updateNote(id: number, updates: UpdateNoteRequest): Promise<void> {
    // 1. Validate note exists and user permissions
    // 2. Process markdown changes
    // 3. Update database record
    // 4. Refresh search index
    // 5. Update tag relationships
    // 6. Update statistics (word count, etc.)
  }

  async deleteNote(id: number): Promise<void> {
    // 1. Remove from search index
    // 2. Delete tag relationships
    // 3. Delete task relationships
    // 4. Delete note record
    // 5. Update tag usage counts
  }

  async getNotes(options: GetNotesOptions): Promise<PaginatedResult<Note>> {
    // Support filtering, sorting, pagination
    // Include tag and link information
    // Optimize for mobile performance
  }

  async searchNotes(query: string, filters: SearchFilters): Promise<SearchResult[]> {
    // Use FTS5 for content search
    // Support tag filtering
    // Include relevance scoring
    // Highlight search terms
  }
}

// src/services/TagManager.ts
export class TagManager {
  async createTag(name: string, color?: string): Promise<Tag> {}
  async updateTag(id: number, updates: Partial<Tag>): Promise<void> {}
  async deleteTag(id: number): Promise<void> {}
  async getPopularTags(limit: number): Promise<Tag[]> {}
  async searchTags(query: string): Promise<Tag[]> {}
  async addTagToNote(noteId: number, tagId: number): Promise<void> {}
  async removeTagFromNote(noteId: number, tagId: number): Promise<void> {}
}

// src/services/LinkingService.ts
export class LinkingService {
  async linkNoteToTask(noteId: number, taskId: number): Promise<void> {}
  async unlinkNoteFromTask(noteId: number, taskId: number): Promise<void> {}
  async getNotesForTask(taskId: number): Promise<Note[]> {}
  async getTasksForNote(noteId: number): Promise<Task[]> {}
  async createTaskFromNote(noteId: number, extractedContent: string): Promise<Task> {}
}

// src/services/SearchService.ts
export class SearchService {
  async search(query: string, options: SearchOptions): Promise<UnifiedSearchResult> {
    // Search across notes and tasks
    // Apply filters and sorting
    // Return unified results with type indicators
  }

  async getSearchSuggestions(partialQuery: string): Promise<string[]> {}
  async saveSearchQuery(query: string): Promise<void> {}
  async getRecentSearches(): Promise<string[]> {}
}
```

## 🧩 Component Architecture

### Screen Components

```typescript
// src/screens/NotesScreen.tsx
export const NotesScreen: React.FC = () => {
  // Main notes list with:
  // - Search bar at top
  // - Filter/sort options
  // - Virtualized list of notes
  // - FAB for creating new notes
  // - Pull-to-refresh
  // - Empty state handling
};

// src/screens/NoteEditorScreen.tsx
export const NoteEditorScreen: React.FC<NoteEditorProps> = ({ route, navigation }) => {
  // Note creation/editing with:
  // - Split view: editor/preview
  // - Markdown toolbar
  // - Tag input
  // - Auto-save functionality
  // - Keyboard handling
  // - Task linking options
};

// src/screens/SearchScreen.tsx
export const SearchScreen: React.FC = () => {
  // Unified search interface:
  // - Search input with suggestions
  // - Filter options (notes/tasks/tags)
  // - Search results with highlighting
  // - Recent searches
  // - Advanced search options
};
```

### Reusable Components

```typescript
// src/components/notes/MarkdownEditor.tsx
interface MarkdownEditorProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  showPreview?: boolean;
  onPreviewToggle?: () => void;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder,
  autoFocus,
  showPreview,
  onPreviewToggle
}) => {
  // Features:
  // - Syntax highlighting hints
  // - Markdown shortcuts (e.g., ** for bold)
  // - Formatting toolbar
  // - Live preview toggle
  // - Auto-completion for links
  // - Undo/redo functionality
};

// src/components/notes/TagInput.tsx
interface TagInputProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  placeholder?: string;
  maxTags?: number;
}

export const TagInput: React.FC<TagInputProps> = ({
  selectedTags,
  onTagsChange,
  placeholder,
  maxTags
}) => {
  // Features:
  // - Autocomplete dropdown
  // - Create new tags inline
  // - Tag chips with remove buttons
  // - Color coding
  // - Popular tag suggestions
};

// src/components/notes/NoteCard.tsx
interface NoteCardProps {
  note: Note;
  onPress: () => void;
  onLongPress?: () => void;
  showTags?: boolean;
  showPreview?: boolean;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onPress,
  onLongPress,
  showTags,
  showPreview
}) => {
  // Features:
  // - Note title and preview
  // - Tag indicators
  // - Date information
  // - Link indicators (if linked to tasks)
  // - Favorite indicator
  // - Swipe actions
};
```

## 🔍 Search Architecture

### Search Index Management

```typescript
// src/services/SearchIndexManager.ts
export class SearchIndexManager {
  async indexNote(note: Note): Promise<void> {
    // Extract searchable content
    const searchContent = {
      note_id: note.id,
      title: note.title,
      content: this.stripMarkdown(note.content),
      tags: note.tags?.map(t => t.name).join(' ') || ''
    };

    // Insert into FTS table
    await this.db.execAsync(
      `INSERT OR REPLACE INTO notes_search VALUES (?, ?, ?, ?)`,
      [searchContent.note_id, searchContent.title, searchContent.content, searchContent.tags]
    );
  }

  async removeFromIndex(noteId: number): Promise<void> {
    await this.db.execAsync(
      `DELETE FROM notes_search WHERE note_id = ?`,
      [noteId]
    );
  }

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    // Build FTS query with proper escaping
    const ftsQuery = this.buildFTSQuery(query, options);
    
    // Execute search with relevance ranking
    const results = await this.db.getAllAsync(`
      SELECT 
        n.*,
        s.rank,
        snippet(notes_search, 1, '<mark>', '</mark>', '...', 32) as title_snippet,
        snippet(notes_search, 2, '<mark>', '</mark>', '...', 64) as content_snippet
      FROM notes_search s
      JOIN notes n ON n.id = s.note_id
      WHERE notes_search MATCH ?
      ORDER BY s.rank
      LIMIT ? OFFSET ?
    `, [ftsQuery, options.limit, options.offset]);

    return this.processSearchResults(results);
  }
}
```

### Unified Search Implementation

```typescript
// src/services/UnifiedSearchService.ts
export interface UnifiedSearchResult {
  notes: SearchResult<Note>[];
  tasks: SearchResult<Task>[];
  tags: SearchResult<Tag>[];
  totalCount: number;
  executionTime: number;
}

export class UnifiedSearchService {
  async search(query: string, options: UnifiedSearchOptions): Promise<UnifiedSearchResult> {
    const startTime = Date.now();
    
    // Parallel search across content types
    const [noteResults, taskResults, tagResults] = await Promise.all([
      options.includeNotes ? this.searchNotes(query, options) : [],
      options.includeTasks ? this.searchTasks(query, options) : [],
      options.includeTags ? this.searchTags(query, options) : []
    ]);

    return {
      notes: noteResults,
      tasks: taskResults,
      tags: tagResults,
      totalCount: noteResults.length + taskResults.length + tagResults.length,
      executionTime: Date.now() - startTime
    };
  }
}
```

## 🔗 Integration Points

### Navigation Integration

```typescript
// src/navigation/MainNavigator.tsx
const Tab = createBottomTabNavigator();

export const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = getTabIcon(route.name, focused);
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Notes" component={NotesScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

// Deep linking support for note-specific URLs
const linking = {
  prefixes: ['productivityapp://'],
  config: {
    screens: {
      Notes: 'notes',
      NoteEditor: 'notes/:id',
      Search: 'search/:query?',
    },
  },
};
```

### Task Integration

```typescript
// src/screens/TaskDetailScreen.tsx - Enhanced to show linked notes
export const TaskDetailScreen: React.FC<TaskDetailProps> = ({ route }) => {
  const { task } = route.params;
  const [linkedNotes, setLinkedNotes] = useState<Note[]>([]);

  useEffect(() => {
    LinkingService.getNotesForTask(task.id).then(setLinkedNotes);
  }, [task.id]);

  return (
    <ScrollView>
      {/* Existing task details */}
      
      <Section title="Linked Notes">
        {linkedNotes.map(note => (
          <NoteCard 
            key={note.id} 
            note={note} 
            showPreview 
            onPress={() => navigation.navigate('NoteEditor', { noteId: note.id })}
          />
        ))}
        <Button 
          title="Link Note" 
          onPress={() => showNoteLinkingModal(task.id)} 
        />
      </Section>
    </ScrollView>
  );
};
```

## 📱 Platform-Specific Considerations

### iOS Specific

```typescript
// Enhanced keyboard handling for iOS
const iosKeyboardBehavior = {
  behavior: Platform.OS === 'ios' ? 'padding' : 'height',
  keyboardVerticalOffset: Platform.OS === 'ios' ? 64 : 0,
};

// Native-like markdown editing shortcuts
const useIOSMarkdownShortcuts = () => {
  return {
    'Cmd+B': () => insertMarkdown('**', '**'),
    'Cmd+I': () => insertMarkdown('*', '*'),
    'Cmd+K': () => insertMarkdown('[', '](url)'),
  };
};
```

### Android Specific

```typescript
// Android-specific optimizations
const androidOptimizations = {
  removeClippedSubviews: true,
  maxToRenderPerBatch: 10,
  windowSize: 10,
  initialNumToRender: 10,
  updateCellsBatchingPeriod: 50,
};

// Hardware back button handling
useEffect(() => {
  const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
    if (hasUnsavedChanges) {
      showSavePrompt();
      return true; // Prevent default behavior
    }
    return false; // Allow default behavior
  });

  return () => backHandler.remove();
}, [hasUnsavedChanges]);
```

### Web Specific

```typescript
// Web-specific keyboard shortcuts
const useWebKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            saveNote();
            break;
          case 'f':
            event.preventDefault();
            focusSearch();
            break;
          case 'n':
            event.preventDefault();
            createNewNote();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
};
```

## 🚀 Performance Optimizations

### Database Optimizations

```typescript
// Connection pooling and prepared statements
export class DatabaseOptimizer {
  private preparedStatements = new Map<string, PreparedStatement>();

  getPreparedStatement(sql: string): PreparedStatement {
    if (!this.preparedStatements.has(sql)) {
      this.preparedStatements.set(sql, this.db.prepareSync(sql));
    }
    return this.preparedStatements.get(sql)!;
  }

  // Batch operations for better performance
  async batchUpdateSearchIndex(notes: Note[]): Promise<void> {
    const statement = this.getPreparedStatement(
      'INSERT OR REPLACE INTO notes_search VALUES (?, ?, ?, ?)'
    );

    this.db.withTransactionSync(() => {
      notes.forEach(note => {
        const searchData = this.prepareSearchData(note);
        statement.executeSync([
          searchData.note_id,
          searchData.title,
          searchData.content,
          searchData.tags
        ]);
      });
    });
  }
}
```

### Component Optimizations

```typescript
// Memoized components for better performance
export const NoteCard = React.memo<NoteCardProps>(({ note, onPress, showTags }) => {
  const theme = useTheme();
  
  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Text style={styles.title} numberOfLines={1}>{note.title}</Text>
      <Text style={styles.preview} numberOfLines={2}>{note.content}</Text>
      {showTags && (
        <TagList tags={note.tags} maxVisible={3} />
      )}
      <Text style={styles.date}>{formatDate(note.updatedAt)}</Text>
    </Pressable>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.note.id === nextProps.note.id &&
    prevProps.note.updatedAt === nextProps.note.updatedAt &&
    prevProps.showTags === nextProps.showTags
  );
});

// Virtualized lists for large datasets
const renderNoteItem = useCallback(({ item }: { item: Note }) => (
  <NoteCard
    note={item}
    onPress={() => navigation.navigate('NoteEditor', { noteId: item.id })}
    showTags
  />
), [navigation]);

const NotesList = () => (
  <FlatList
    data={notes}
    renderItem={renderNoteItem}
    keyExtractor={item => item.id.toString()}
    removeClippedSubviews
    maxToRenderPerBatch={10}
    windowSize={10}
    initialNumToRender={10}
    getItemLayout={(data, index) => ({
      length: NOTE_CARD_HEIGHT,
      offset: NOTE_CARD_HEIGHT * index,
      index,
    })}
  />
);
```

## 🔐 Security & Privacy

### Data Sanitization

```typescript
// Input sanitization for markdown content
export class MarkdownSanitizer {
  static sanitize(input: string): string {
    // Remove potentially dangerous markdown
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:(?!image\/)/gi, '');
  }

  static validateTags(tags: string[]): string[] {
    return tags
      .filter(tag => tag.length <= 50 && tag.length > 0)
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => /^[a-zA-Z0-9\-_]+$/.test(tag));
  }
}
```

### Data Export Security

```typescript
// Secure data export with user consent
export class DataExporter {
  async exportUserData(): Promise<ExportResult> {
    // Show privacy notice
    const consent = await this.showPrivacyConsent();
    if (!consent) return { success: false, reason: 'User declined' };

    // Export only user's own data
    const userData = await this.gatherUserData();
    
    // Sanitize exported data
    const sanitizedData = this.sanitizeExportData(userData);
    
    // Encrypt if needed
    const exportData = await this.encryptForExport(sanitizedData);
    
    return { success: true, data: exportData };
  }
}
```

This technical architecture provides a comprehensive foundation for implementing the notes system while maintaining the existing app's patterns and ensuring scalability, performance, and user experience across all platforms.