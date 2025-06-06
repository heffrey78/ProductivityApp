import * as SQLite from 'expo-sqlite';

export const migration005 = {
  version: 5,
  name: 'add_recordings_system',
  up: async (db: SQLite.SQLiteDatabase) => {
    // Recordings table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS recordings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        file_path TEXT NOT NULL UNIQUE,
        file_name TEXT NOT NULL,
        duration INTEGER DEFAULT 0,
        file_size INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_favorite BOOLEAN DEFAULT FALSE,
        transcription TEXT,
        notes TEXT
      )
    `);

    // Recording-Notes junction table (attach recordings to notes)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS note_recordings (
        note_id INTEGER,
        recording_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (note_id, recording_id),
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE
      )
    `);

    // Recording-Tasks junction table (attach recordings to tasks)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS task_recordings (
        task_id INTEGER,
        recording_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (task_id, recording_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for performance
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON recordings(created_at DESC)');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_recordings_duration ON recordings(duration DESC)');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_recordings_favorite ON recordings(is_favorite DESC)');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_recordings_file_path ON recordings(file_path)');
  },
  
  down: async (db: SQLite.SQLiteDatabase) => {
    await db.execAsync('DROP INDEX IF EXISTS idx_recordings_created_at');
    await db.execAsync('DROP INDEX IF EXISTS idx_recordings_duration');
    await db.execAsync('DROP INDEX IF EXISTS idx_recordings_favorite');
    await db.execAsync('DROP INDEX IF EXISTS idx_recordings_file_path');
    await db.execAsync('DROP TABLE IF EXISTS task_recordings');
    await db.execAsync('DROP TABLE IF EXISTS note_recordings');
    await db.execAsync('DROP TABLE IF EXISTS recordings');
  }
};