import * as SQLite from 'expo-sqlite';

export const migration003 = {
  version: 3,
  name: 'add_notes_system',
  up: async (db: SQLite.SQLiteDatabase) => {
    // Notes table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        markdown_content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        category TEXT DEFAULT 'general',
        is_favorite BOOLEAN DEFAULT FALSE,
        word_count INTEGER DEFAULT 0,
        char_count INTEGER DEFAULT 0
      )
    `);

    // Tags table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        color TEXT DEFAULT '#007AFF',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        usage_count INTEGER DEFAULT 0
      )
    `);

    // Note-Tags junction table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS note_tags (
        note_id INTEGER,
        tag_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (note_id, tag_id),
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `);

    // Task-Notes junction table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS task_notes (
        task_id INTEGER,
        note_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (task_id, note_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for performance
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC)');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC)');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category)');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC)');

    // Simple search index table (FTS5 not available in expo-sqlite)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS notes_search (
        note_id INTEGER PRIMARY KEY,
        searchable_text TEXT,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
      )
    `);
  },
  
  down: async (db: SQLite.SQLiteDatabase) => {
    await db.execAsync('DROP INDEX IF EXISTS idx_notes_created_at');
    await db.execAsync('DROP INDEX IF EXISTS idx_notes_updated_at');
    await db.execAsync('DROP INDEX IF EXISTS idx_notes_category');
    await db.execAsync('DROP INDEX IF EXISTS idx_tags_name');
    await db.execAsync('DROP INDEX IF EXISTS idx_tags_usage');
    await db.execAsync('DROP TABLE IF EXISTS notes_search');
    await db.execAsync('DROP TABLE IF EXISTS task_notes');
    await db.execAsync('DROP TABLE IF EXISTS note_tags');
    await db.execAsync('DROP TABLE IF EXISTS tags');
    await db.execAsync('DROP TABLE IF EXISTS notes');
  }
};