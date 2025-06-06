import { Migration } from '../migrationManager';
import { migration003 } from './003_add_notes_system';
import { migration004 } from './004_add_tags_system';
import { migration005 } from './005_add_recordings_system';

// Initial tasks table migration
export const migration001: Migration = {
  version: 1,
  name: 'create_tasks_table',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        completed INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  },
  down: async (db) => {
    await db.execAsync('DROP TABLE IF EXISTS tasks');
  }
};

// Export all migrations in order
export const migrations: Migration[] = [
  migration001,
  migration003,
  migration004,
  migration005,
];