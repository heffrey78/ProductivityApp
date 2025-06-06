import { Platform } from 'react-native';
import { webStorageManager } from './webStorage';
import { migrationManager } from './migrationManager';
import { migrations } from './migrations';
import { dbConnection } from './DatabaseConnection';

export interface Task {
  id?: number;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

class DatabaseManager {
  private initialized = false;

  async initializeDatabase(): Promise<void> {
    if (this.initialized) return;

    if (Platform.OS === 'web') {
      await webStorageManager.initializeDatabase();
      this.initialized = true;
      return;
    }

    try {
      await dbConnection.initialize();
      
      // Run migrations
      await migrationManager.runMigrations(migrations);
      
      this.initialized = true;
      console.log('Database initialized successfully with migrations');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async getAllTasks(): Promise<Task[]> {
    if (Platform.OS === 'web') {
      return webStorageManager.getAllTasks();
    }

    await this.initializeDatabase();

    const result = await dbConnection.getAllAsync<{
      id: number;
      title: string;
      description: string | null;
      completed: number;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM tasks ORDER BY created_at DESC');

    return result.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      completed: Boolean(row.completed),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async createTask(title: string, description?: string): Promise<Task> {
    if (Platform.OS === 'web') {
      return webStorageManager.createTask(title, description);
    }

    await this.initializeDatabase();

    const now = new Date().toISOString();
    const result = await dbConnection.runAsync(
      'INSERT INTO tasks (title, description, completed, created_at, updated_at) VALUES (?, ?, 0, ?, ?)',
      title, description || null, now, now
    );

    return {
      id: result.lastInsertRowId,
      title,
      description,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateTask(id: number, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<void> {
    if (Platform.OS === 'web') {
      return webStorageManager.updateTask(id, updates);
    }

    await this.initializeDatabase();

    const now = new Date().toISOString();
    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      setClauses.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      setClauses.push('description = ?');
      values.push(updates.description);
    }
    if (updates.completed !== undefined) {
      setClauses.push('completed = ?');
      values.push(updates.completed ? 1 : 0);
    }

    setClauses.push('updated_at = ?');
    values.push(now);

    if (setClauses.length > 1) { // More than just updated_at
      const query = `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`;
      values.push(id);
      await dbConnection.runAsync(query, ...values);
    }
  }

  async deleteTask(id: number): Promise<void> {
    if (Platform.OS === 'web') {
      return webStorageManager.deleteTask(id);
    }

    await this.initializeDatabase();
    await dbConnection.runAsync('DELETE FROM tasks WHERE id = ?', id);
  }

  async toggleTaskComplete(id: number): Promise<void> {
    if (Platform.OS === 'web') {
      return webStorageManager.toggleTaskComplete(id);
    }

    await this.initializeDatabase();
    
    const task = await dbConnection.getFirstAsync<{completed: number}>(
      'SELECT completed FROM tasks WHERE id = ?', id
    );
    
    if (task) {
      const newCompleted = task.completed ? 0 : 1;
      await this.updateTask(id, { completed: Boolean(newCompleted) });
    }
  }
}

export const databaseManager = new DatabaseManager();