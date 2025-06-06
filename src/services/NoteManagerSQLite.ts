import { Platform } from 'react-native';
import { Note, CreateNoteRequest, UpdateNoteRequest } from '../types/Note';
import { tagManager } from './TagManager';
import { dbConnection } from '../database/DatabaseConnection';

export class NoteManagerSQLite {
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
      await dbConnection.initialize();
      
      // Create notes table if it doesn't exist
      await dbConnection.execAsync(`
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
      await dbConnection.execAsync(`
        CREATE TABLE IF NOT EXISTS notes_search (
          note_id INTEGER PRIMARY KEY,
          searchable_text TEXT,
          FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
        )
      `);

      // Create indexes
      await dbConnection.execAsync('CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC)');
      
      this.initialized = true;
      console.log('NoteManager SQLite initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NoteManager SQLite:', error);
      throw error;
    }
  }

  async createNote(noteData: CreateNoteRequest): Promise<Note> {
    await this.initialize();

    console.log('NoteManager: Creating note with data:', {
      title: noteData.title,
      contentLength: noteData.markdown_content.length,
      category: noteData.category,
      tagIds: noteData.tagIds
    });

    const plainContent = this.stripMarkdown(noteData.markdown_content);
    const wordCount = this.countWords(noteData.markdown_content);
    const charCount = noteData.markdown_content.length;
    const now = new Date().toISOString();

    try {
      return await dbConnection.runInTransaction(async (db) => {
      // Insert note
      const result = await db.runAsync(
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

      const noteId = result.lastInsertRowId;

      // Update search index
      await db.runAsync(
        'INSERT INTO notes_search (note_id, searchable_text) VALUES (?, ?)',
        noteId,
        `${noteData.title} ${plainContent}`
      );

      // Add tags if provided
      if (noteData.tagIds && noteData.tagIds.length > 0) {
        console.log('NoteManager: Adding tags to new note:', { noteId, tagIds: noteData.tagIds });
        await tagManager.addTagsToNote(noteId, noteData.tagIds);
      } else {
        console.log('NoteManager: No tags to add to new note');
      }

      const note: Note = {
        id: noteId,
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

      // Load tags if they were added
      if (noteData.tagIds && noteData.tagIds.length > 0) {
        console.log('NoteManager: Loading tags for new note:', noteId);
        note.tags = await tagManager.getTagsForNote(noteId);
        console.log('NoteManager: Loaded tags for new note:', note.tags);
      } else {
        note.tags = [];
      }

      console.log('NoteManager: Note created successfully with ID:', noteId);
      return note;
    });
    } catch (error) {
      console.error('NoteManager: Failed to create note:', error);
      console.error('NoteManager: Error details:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async updateNote(id: number, updates: UpdateNoteRequest): Promise<void> {
    await this.initialize();

    console.log('NoteManager: Updating note with data:', {
      id,
      title: updates.title,
      contentLength: updates.markdown_content?.length,
      category: updates.category,
      tagIds: updates.tagIds
    });

    try {
      return await dbConnection.runInTransaction(async (db) => {
      const setClauses: string[] = [];
      const values: any[] = [];
      let searchText = '';

      // Get current title for search index if not updating title
      if (updates.title === undefined && updates.markdown_content !== undefined) {
        const currentNote = await db.getFirstAsync<{title: string}>(
          'SELECT title FROM notes WHERE id = ?', id
        );
        if (currentNote) {
          searchText = currentNote.title;
        }
      }

      if (updates.title !== undefined) {
        setClauses.push('title = ?');
        values.push(updates.title);
        searchText = updates.title;
      }

      if (updates.markdown_content !== undefined) {
        const plainContent = this.stripMarkdown(updates.markdown_content);
        const wordCount = this.countWords(updates.markdown_content);
        const charCount = updates.markdown_content.length;

        setClauses.push('markdown_content = ?', 'content = ?', 'word_count = ?', 'char_count = ?');
        values.push(updates.markdown_content, plainContent, wordCount, charCount);

        // Update search index
        await db.runAsync(
          'UPDATE notes_search SET searchable_text = ? WHERE note_id = ?',
          `${searchText} ${plainContent}`,
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

      if (setClauses.length > 1) { // More than just updated_at
        const query = `UPDATE notes SET ${setClauses.join(', ')} WHERE id = ?`;
        values.push(id);
        await db.runAsync(query, ...values);
      }

      // Update tags if provided
      if (updates.tagIds !== undefined) {
        console.log('NoteManager: Updating tags for note:', { noteId: id, tagIds: updates.tagIds });
        await tagManager.addTagsToNote(id, updates.tagIds);
      } else {
        console.log('NoteManager: No tag updates provided');
      }
      
      console.log('NoteManager: Note updated successfully:', id);
    });
    } catch (error) {
      console.error('NoteManager: Failed to update note:', error);
      console.error('NoteManager: Error details:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async deleteNote(id: number): Promise<void> {
    await this.initialize();

    return await dbConnection.runInTransaction(async (db) => {
      await db.runAsync('DELETE FROM notes WHERE id = ?', id);
      await db.runAsync('DELETE FROM notes_search WHERE note_id = ?', id);
    });
  }

  async getNoteById(id: number): Promise<Note | null> {
    await this.initialize();

    const result = await dbConnection.getFirstAsync<{
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

    const note: Note = {
      ...result,
      is_favorite: Boolean(result.is_favorite),
    };

    // Load tags for the note
    note.tags = await tagManager.getTagsForNote(id);

    return note;
  }

  async getAllNotes(): Promise<Note[]> {
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
    }>('SELECT * FROM notes ORDER BY updated_at DESC');

    const notes: Note[] = results.map(row => ({
      ...row,
      is_favorite: Boolean(row.is_favorite),
      tags: [], // Will be populated below
    }));

    // Load tags for all notes
    for (const note of notes) {
      note.tags = await tagManager.getTagsForNote(note.id);
    }

    return notes;
  }

  async searchNotes(query: string): Promise<Note[]> {
    await this.initialize();

    const searchTerm = `%${query.toLowerCase()}%`;
    
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
       JOIN notes_search ns ON n.id = ns.note_id 
       WHERE LOWER(ns.searchable_text) LIKE ?
       ORDER BY n.updated_at DESC`,
      searchTerm
    );

    const notes: Note[] = results.map(row => ({
      ...row,
      is_favorite: Boolean(row.is_favorite),
      tags: [], // Will be populated below
    }));

    // Load tags for search results
    for (const note of notes) {
      note.tags = await tagManager.getTagsForNote(note.id);
    }

    return notes;
  }

  async getNotesByTag(tagId: number): Promise<Note[]> {
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
       JOIN note_tags nt ON n.id = nt.note_id 
       WHERE nt.tag_id = ? 
       ORDER BY n.updated_at DESC`,
      tagId
    );

    const notes: Note[] = results.map(row => ({
      ...row,
      is_favorite: Boolean(row.is_favorite),
      tags: [], // Will be populated below
    }));

    // Load all tags for these notes
    for (const note of notes) {
      note.tags = await tagManager.getTagsForNote(note.id);
    }

    return notes;
  }

  async getNotesByCategory(category: string): Promise<Note[]> {
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
    }>('SELECT * FROM notes WHERE category = ? ORDER BY updated_at DESC', category);

    const notes: Note[] = results.map(row => ({
      ...row,
      is_favorite: Boolean(row.is_favorite),
      tags: [], // Will be populated below
    }));

    // Load tags for all notes
    for (const note of notes) {
      note.tags = await tagManager.getTagsForNote(note.id);
    }

    return notes;
  }
}

// Singleton instance
export const noteManagerSQLite = new NoteManagerSQLite();