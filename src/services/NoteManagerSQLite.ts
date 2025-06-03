import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { Note, CreateNoteRequest, UpdateNoteRequest } from '../types/Note';

export class NoteManagerSQLite {
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized = false;

  private stripMarkdown(text: string): string {
    // Simple markdown stripping for search
    return text
      .replace(/#{1,6}\s*/g, '') // Headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
      .replace(/\*([^*]+)\*/g, '$1') // Italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
      .replace(/`([^`]+)`/g, '$1') // Inline code
      .replace(/```[^`]*```/g, '') // Code blocks
      .replace(/^\s*[-*+]\s+/gm, '') // Lists
      .replace(/^\s*\d+\.\s+/gm, ''); // Numbered lists
  }

  private countWords(text: string): number {
    const stripped = this.stripMarkdown(text);
    return stripped.split(/\s+/).filter(word => word.length > 0).length;
  }

  async initialize(): Promise<void> {
    if (this.initialized || Platform.OS === 'web') return;

    try {
      this.db = await SQLite.openDatabaseAsync('productivity.db');
      
      // Create notes table if it doesn't exist
      await this.db.execAsync(`
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

      // Create search index table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS notes_search (
          note_id INTEGER PRIMARY KEY,
          searchable_text TEXT,
          FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
        )
      `);

      // Create indexes
      await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC)');
      
      this.initialized = true;
      console.log('NoteManager SQLite initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NoteManager SQLite:', error);
      throw error;
    }
  }

  async createNote(noteData: CreateNoteRequest): Promise<Note> {
    await this.initialize();

    if (!this.db) throw new Error('Database not initialized');

    const plainContent = this.stripMarkdown(noteData.markdown_content);
    const wordCount = this.countWords(noteData.markdown_content);
    const charCount = noteData.markdown_content.length;
    const now = new Date().toISOString();

    const result = await this.db.runAsync(
      `INSERT INTO notes (title, content, markdown_content, created_at, updated_at, category, is_favorite, word_count, char_count) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      noteData.title,
      plainContent,
      noteData.markdown_content,
      now,
      now,
      noteData.category || 'general',
      noteData.is_favorite ? 1 : 0,
      wordCount,
      charCount
    );

    // Update search index
    await this.db.runAsync(
      'INSERT INTO notes_search (note_id, searchable_text) VALUES (?, ?)',
      result.lastInsertRowId,
      `${noteData.title} ${plainContent}`
    );

    return {
      id: result.lastInsertRowId,
      title: noteData.title,
      content: plainContent,
      markdown_content: noteData.markdown_content,
      created_at: now,
      updated_at: now,
      category: noteData.category || 'general',
      is_favorite: noteData.is_favorite || false,
      word_count: wordCount,
      char_count: charCount,
    };
  }

  async updateNote(id: number, updates: UpdateNoteRequest): Promise<void> {
    await this.initialize();

    if (!this.db) throw new Error('Database not initialized');

    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      setClauses.push('title = ?');
      values.push(updates.title);
    }

    if (updates.markdown_content !== undefined) {
      const plainContent = this.stripMarkdown(updates.markdown_content);
      const wordCount = this.countWords(updates.markdown_content);
      const charCount = updates.markdown_content.length;

      setClauses.push('markdown_content = ?', 'content = ?', 'word_count = ?', 'char_count = ?');
      values.push(updates.markdown_content, plainContent, wordCount, charCount);

      // Update search index
      await this.db.runAsync(
        'UPDATE notes_search SET searchable_text = ? WHERE note_id = ?',
        `${updates.title || ''} ${plainContent}`,
        id
      );
    }

    if (updates.category !== undefined) {
      setClauses.push('category = ?');
      values.push(updates.category);
    }

    if (updates.is_favorite !== undefined) {
      setClauses.push('is_favorite = ?');
      values.push(updates.is_favorite ? 1 : 0);
    }

    setClauses.push('updated_at = ?');
    values.push(new Date().toISOString());

    const query = `UPDATE notes SET ${setClauses.join(', ')} WHERE id = ?`;
    values.push(id);

    await this.db.runAsync(query, ...values);
  }

  async deleteNote(id: number): Promise<void> {
    await this.initialize();

    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM notes WHERE id = ?', id);
    await this.db.runAsync('DELETE FROM notes_search WHERE note_id = ?', id);
  }

  async getNoteById(id: number): Promise<Note | null> {
    await this.initialize();

    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<{
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
    }>('SELECT * FROM notes WHERE id = ?', id);

    if (!result) return null;

    return {
      ...result,
      is_favorite: Boolean(result.is_favorite),
    };
  }

  async getAllNotes(): Promise<Note[]> {
    await this.initialize();

    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<{
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
    }>('SELECT * FROM notes ORDER BY updated_at DESC');

    return results.map(row => ({
      ...row,
      is_favorite: Boolean(row.is_favorite),
    }));
  }

  async searchNotes(query: string): Promise<Note[]> {
    await this.initialize();

    if (!this.db) throw new Error('Database not initialized');

    const searchTerm = `%${query.toLowerCase()}%`;
    
    const results = await this.db.getAllAsync<{
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
       JOIN notes_search ns ON n.id = ns.note_id 
       WHERE LOWER(ns.searchable_text) LIKE ?
       ORDER BY n.updated_at DESC`,
      searchTerm
    );

    return results.map(row => ({
      ...row,
      is_favorite: Boolean(row.is_favorite),
    }));
  }
}

// Singleton instance
export const noteManagerSQLite = new NoteManagerSQLite();