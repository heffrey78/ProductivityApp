import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { dbConnection } from './DatabaseConnection';

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
  down: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

export class MigrationManager {

  async initialize(): Promise<void> {
    if (Platform.OS === 'web') {
      // Web doesn't need migrations as we're using in-memory storage
      return;
    }

    await dbConnection.initialize();

    // Create migrations table using new API
    await dbConnection.execAsync(
      `CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    );
  }

  async getCurrentVersion(): Promise<number> {
    if (Platform.OS === 'web') {
      return 0;
    }

    try {
      const result = await dbConnection.getFirstAsync<{ version: number | null }>(
        'SELECT MAX(version) as version FROM migrations'
      );
      return result?.version || 0;
    } catch (error) {
      // If table doesn't exist yet, return 0
      return 0;
    }
  }

  async applyMigration(migration: Migration): Promise<void> {
    if (Platform.OS === 'web') {
      return;
    }

    console.log(`Applying migration ${migration.version}: ${migration.name}`);

    const db = dbConnection.getDatabase();
    await migration.up(db);

    // Record migration
    await dbConnection.runAsync(
      'INSERT INTO migrations (version, name) VALUES (?, ?)',
      migration.version, migration.name
    );
  }

  async runMigrations(migrations: Migration[]): Promise<void> {
    await this.initialize();
    const currentVersion = await this.getCurrentVersion();

    // Sort migrations by version
    const sortedMigrations = migrations.sort((a, b) => a.version - b.version);

    // Apply pending migrations
    for (const migration of sortedMigrations) {
      if (migration.version > currentVersion) {
        await this.applyMigration(migration);
      }
    }
  }
}

export const migrationManager = new MigrationManager();