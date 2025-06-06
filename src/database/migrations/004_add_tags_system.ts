import * as SQLite from 'expo-sqlite';

export const migration004 = {
  version: 4,
  name: 'add_tags_system',
  up: async (db: SQLite.SQLiteDatabase) => {
    // Create tags table if it doesn't exist
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        color TEXT DEFAULT '#007AFF',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        usage_count INTEGER DEFAULT 0
      )
    `);

    // Create note_tags junction table if it doesn't exist
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

    // Create indexes for better performance
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC)');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id)');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id)');

    // Add categories column to notes if it doesn't exist
    try {
      await db.execAsync('ALTER TABLE notes ADD COLUMN category TEXT DEFAULT "general"');
    } catch (error) {
      // Column might already exist from previous migration
      console.log('Category column might already exist:', error);
    }
  },
  
  down: async (db: SQLite.SQLiteDatabase) => {
    await db.execAsync('DROP INDEX IF EXISTS idx_note_tags_tag_id');
    await db.execAsync('DROP INDEX IF EXISTS idx_note_tags_note_id');
    await db.execAsync('DROP INDEX IF EXISTS idx_tags_usage');
    await db.execAsync('DROP INDEX IF EXISTS idx_tags_name');
    await db.execAsync('DROP TABLE IF EXISTS note_tags');
    await db.execAsync('DROP TABLE IF EXISTS tags');
  }
};