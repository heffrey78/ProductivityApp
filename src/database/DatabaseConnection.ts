import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

export type DatabaseRetryOptions = {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
};

export class DatabaseConnection {
  private static instance: DatabaseConnection | null = null;
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitializing = false;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (this.initialized) return;

    // If currently initializing, wait for that to complete
    if (this.isInitializing && this.initializationPromise) {
      return this.initializationPromise;
    }

    // Start initialization
    this.isInitializing = true;
    this.initializationPromise = this.doInitialize();

    try {
      await this.initializationPromise;
    } finally {
      this.isInitializing = false;
      this.initializationPromise = null;
    }
  }

  private async doInitialize(): Promise<void> {
    if (Platform.OS === 'web') {
      this.initialized = true;
      return;
    }

    try {
      this.db = await SQLite.openDatabaseAsync('productivity.db');
      this.initialized = true;
      console.log('Central database connection initialized successfully');
    } catch (error) {
      console.error('Failed to initialize central database connection:', error);
      throw error;
    }
  }

  getDatabase(): SQLite.SQLiteDatabase {
    if (!this.initialized || !this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async close(): Promise<void> {
    if (this.db) {
      try {
        await this.db.closeAsync();
        console.log('Database connection closed successfully');
      } catch (error) {
        console.error('Error closing database connection:', error);
      } finally {
        this.db = null;
        this.initialized = false;
        this.isInitializing = false;
        this.initializationPromise = null;
      }
    }
  }

  async reset(): Promise<void> {
    await this.close();
    DatabaseConnection.instance = null;
  }

  async withRetry<T>(
    operation: () => Promise<T>,
    options: DatabaseRetryOptions = {}
  ): Promise<T> {
    const { maxRetries = 3, baseDelay = 100, maxDelay = 1000 } = options;
    
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check if database connection is still valid
        if (this.db && this.initialized) {
          return await operation();
        } else {
          // Connection lost, reinitialize
          console.warn('Database connection lost, reinitializing...');
          await this.doInitialize();
          return await operation();
        }
      } catch (error: any) {
        lastError = error;
        
        // Don't retry certain types of errors
        if (
          error.message?.includes('UNIQUE constraint failed') ||
          error.message?.includes('NOT NULL constraint failed') ||
          error.message?.includes('CHECK constraint failed')
        ) {
          throw error;
        }
        
        // Handle database locked or connection errors
        if (error.message?.includes('database is locked') || 
            error.message?.includes('connection') ||
            error.message?.includes('SQLITE_BUSY')) {
          console.warn('Database lock detected, will retry after delay');
          // Reset connection on lock errors
          this.db = null;
          this.initialized = false;
        }
        
        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        console.warn(`Database operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  async runInTransaction<T>(operations: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
    await this.initialize();
    const db = this.getDatabase();
    
    return this.withRetry(async () => {
      let result: T;
      await db.withTransactionAsync(async () => {
        result = await operations(db);
      });
      return result!;
    });
  }

  async runAsync(query: string, ...params: any[]): Promise<SQLite.SQLiteRunResult> {
    await this.initialize();
    const db = this.getDatabase();
    
    return this.withRetry(async () => {
      return await db.runAsync(query, ...params);
    });
  }

  async getAllAsync<T>(query: string, ...params: any[]): Promise<T[]> {
    await this.initialize();
    const db = this.getDatabase();
    
    return this.withRetry(async () => {
      return await db.getAllAsync<T>(query, ...params);
    });
  }

  async getFirstAsync<T>(query: string, ...params: any[]): Promise<T | null> {
    await this.initialize();
    const db = this.getDatabase();
    
    return this.withRetry(async () => {
      return await db.getFirstAsync<T>(query, ...params);
    });
  }

  async execAsync(query: string): Promise<void> {
    await this.initialize();
    const db = this.getDatabase();
    
    return this.withRetry(async () => {
      return await db.execAsync(query);
    });
  }
}

// Export singleton instance
export const dbConnection = DatabaseConnection.getInstance();