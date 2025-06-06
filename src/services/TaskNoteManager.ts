import { Platform } from 'react-native';
import { dbConnection } from '../database/DatabaseConnection';
import { Task } from '../database/database';
import { Note } from '../types/Note';
import { TaskNote, TaskWithNotes, NoteWithTasks, LinkTaskNoteRequest, CreateTaskFromNoteRequest } from '../types/TaskNote';
import { databaseManager } from '../database/database';
import { noteManagerSQLite } from './NoteManagerSQLite';

export class TaskNoteManager {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized || Platform.OS === 'web') return;

    try {
      await dbConnection.initialize();
      this.initialized = true;
      console.log('TaskNoteManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize TaskNoteManager:', error);
      throw error;
    }
  }

  async linkTaskToNote(request: LinkTaskNoteRequest): Promise<void> {
    if (Platform.OS === 'web') {
      // For web platform, we'll store the links in localStorage
      const links = this.getWebStorageLinks();
      const linkKey = `${request.taskId}-${request.noteId}`;
      if (!links[linkKey]) {
        links[linkKey] = {
          task_id: request.taskId,
          note_id: request.noteId,
          created_at: new Date().toISOString(),
        };
        localStorage.setItem('task_note_links', JSON.stringify(links));
      }
      return;
    }

    await this.initialize();

    return await dbConnection.runInTransaction(async (db) => {
      // Check if link already exists
      const existing = await db.getFirstAsync<TaskNote>(
        'SELECT * FROM task_notes WHERE task_id = ? AND note_id = ?',
        request.taskId, request.noteId
      );

      if (existing) {
        throw new Error('Task and note are already linked');
      }

      // Create the link
      await db.runAsync(
        'INSERT INTO task_notes (task_id, note_id, created_at) VALUES (?, ?, ?)',
        request.taskId, request.noteId, new Date().toISOString()
      );
    });
  }

  async unlinkTaskFromNote(taskId: number, noteId: number): Promise<void> {
    if (Platform.OS === 'web') {
      const links = this.getWebStorageLinks();
      const linkKey = `${taskId}-${noteId}`;
      delete links[linkKey];
      localStorage.setItem('task_note_links', JSON.stringify(links));
      return;
    }

    await this.initialize();

    await dbConnection.runAsync(
      'DELETE FROM task_notes WHERE task_id = ? AND note_id = ?',
      taskId, noteId
    );
  }

  async getNotesForTask(taskId: number): Promise<Note[]> {
    if (Platform.OS === 'web') {
      const links = this.getWebStorageLinks();
      const noteIds = Object.values(links)
        .filter(link => link.task_id === taskId)
        .map(link => link.note_id);
      
      // For web, we'd need to implement note storage first
      return [];
    }

    await this.initialize();

    const results = await dbConnection.getAllAsync<{
      id: number;
      title: string;
      content: string;
      markdown_content: string;
      created_at: string;
      updated_at: string;
      category: string;
      is_favorite: number;
      word_count: number;
      char_count: number;
    }>(
      `SELECT n.* FROM notes n 
       JOIN task_notes tn ON n.id = tn.note_id 
       WHERE tn.task_id = ? 
       ORDER BY tn.created_at DESC`,
      taskId
    );

    return results.map(row => ({
      ...row,
      is_favorite: Boolean(row.is_favorite),
    }));
  }

  async getTasksForNote(noteId: number): Promise<Task[]> {
    if (Platform.OS === 'web') {
      const links = this.getWebStorageLinks();
      const taskIds = Object.values(links)
        .filter(link => link.note_id === noteId)
        .map(link => link.task_id);
      
      // Get tasks from web storage
      const allTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      return allTasks.filter((task: Task) => taskIds.includes(task.id!));
    }

    await this.initialize();

    const results = await dbConnection.getAllAsync<{
      id: number;
      title: string;
      description: string | null;
      completed: number;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT t.* FROM tasks t 
       JOIN task_notes tn ON t.id = tn.task_id 
       WHERE tn.note_id = ? 
       ORDER BY tn.created_at DESC`,
      noteId
    );

    return results.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      completed: Boolean(row.completed),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getTaskWithNotes(taskId: number): Promise<TaskWithNotes | null> {
    const tasks = await databaseManager.getAllTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) return null;

    const linkedNotes = await this.getNotesForTask(taskId);
    
    return {
      ...task,
      linkedNotes,
    };
  }

  async getNoteWithTasks(noteId: number): Promise<NoteWithTasks | null> {
    const note = await noteManagerSQLite.getNoteById(noteId);
    
    if (!note) return null;

    const linkedTasks = await this.getTasksForNote(noteId);
    
    return {
      ...note,
      linkedTasks,
    };
  }

  async createTaskFromNote(request: CreateTaskFromNoteRequest): Promise<Task> {
    // Create the task
    const task = await databaseManager.createTask(request.title, request.description);
    
    if (!task.id) {
      throw new Error('Failed to create task');
    }

    // Link the task to the note
    await this.linkTaskToNote({
      taskId: task.id,
      noteId: request.noteId,
    });

    return task;
  }

  async extractActionItemsFromNote(noteId: number): Promise<string[]> {
    const note = await noteManagerSQLite.getNoteById(noteId);
    if (!note) return [];

    const actionItems: string[] = [];
    const lines = note.markdown_content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for markdown checkboxes
      const checkboxMatch = trimmed.match(/^-\s*\[\s*\]\s*(.+)$/);
      if (checkboxMatch) {
        actionItems.push(checkboxMatch[1].trim());
        continue;
      }

      // Look for action keywords
      const actionWords = ['TODO:', 'FIXME:', 'Action:', 'Do:', 'Task:'];
      for (const actionWord of actionWords) {
        if (trimmed.toUpperCase().includes(actionWord)) {
          const actionText = trimmed.replace(new RegExp(actionWord, 'i'), '').trim();
          if (actionText) {
            actionItems.push(actionText);
          }
          break;
        }
      }
    }

    return actionItems;
  }

  async bulkCreateTasksFromNote(noteId: number): Promise<Task[]> {
    const actionItems = await this.extractActionItemsFromNote(noteId);
    const tasks: Task[] = [];

    for (const actionItem of actionItems) {
      try {
        const task = await this.createTaskFromNote({
          noteId,
          title: actionItem,
          description: `Created from note`,
        });
        tasks.push(task);
      } catch (error) {
        console.error('Failed to create task from action item:', actionItem, error);
      }
    }

    return tasks;
  }

  private getWebStorageLinks(): Record<string, TaskNote> {
    const linksJson = localStorage.getItem('task_note_links');
    return linksJson ? JSON.parse(linksJson) : {};
  }

  async getAllTaskNoteLinks(): Promise<TaskNote[]> {
    if (Platform.OS === 'web') {
      return Object.values(this.getWebStorageLinks());
    }

    await this.initialize();

    return await dbConnection.getAllAsync<TaskNote>(
      'SELECT * FROM task_notes ORDER BY created_at DESC'
    );
  }
}

// Singleton instance
export const taskNoteManager = new TaskNoteManager();