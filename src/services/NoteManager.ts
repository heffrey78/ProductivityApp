import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { Note, Tag, CreateNoteRequest, UpdateNoteRequest } from '../types/Note';

export class NoteManager {
  private db: SQLite.SQLiteDatabase | null = null;
  private webNotes: Map<number, Note> = new Map();
  private webTags: Map<number, Tag> = new Map();
  private nextId = 1;
  private nextTagId = 1;

  async initialize() {
    if (Platform.OS !== 'web' && !this.db) {
      this.db = await SQLite.openDatabaseAsync('productivity.db');
    }
  }

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

  async createNote(noteData: CreateNoteRequest): Promise<Note> {
    await this.initialize();
    
    const plainContent = this.stripMarkdown(noteData.markdown_content);
    const wordCount = this.countWords(noteData.markdown_content);
    const charCount = noteData.markdown_content.length;
    const now = new Date().toISOString();

    if (Platform.OS === 'web') {
      // Web implementation
      const note: Note = {
        id: this.nextId++,
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
      this.webNotes.set(note.id, note);
      return note;
    }

    // SQLite implementation using new async API
    const result = await this.db!.runAsync(
      `INSERT INTO notes (title, content, markdown_content, category, is_favorite, word_count, char_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        noteData.title,
        plainContent,
        noteData.markdown_content,
        noteData.category || 'general',
        noteData.is_favorite ? 1 : 0,
        wordCount,
        charCount
      ]
    );

    const note: Note = {
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

    // Update search index
    try {
      await this.db!.runAsync(
        'INSERT INTO notes_search (note_id, searchable_text) VALUES (?, ?)',
        [note.id, `${noteData.title} ${plainContent}`.toLowerCase()]
      );
    } catch (error) {
      console.error('Failed to update search index:', error);
      // Continue even if search index fails
    }

    return note;
  }

  async updateNote(id: number, updates: UpdateNoteRequest): Promise<void> {
    if (Platform.OS === 'web') {
      const note = this.webNotes.get(id);
      if (!note) throw new Error('Note not found');

      if (updates.title !== undefined) note.title = updates.title;
      if (updates.markdown_content !== undefined) {
        note.markdown_content = updates.markdown_content;
        note.content = this.stripMarkdown(updates.markdown_content);
        note.word_count = this.countWords(updates.markdown_content);
        note.char_count = updates.markdown_content.length;
      }
      if (updates.category !== undefined) note.category = updates.category;
      if (updates.is_favorite !== undefined) note.is_favorite = updates.is_favorite;
      note.updated_at = new Date().toISOString();
      return;
    }

    // SQLite implementation
    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        const fields: string[] = [];
        const values: any[] = [];

        if (updates.title !== undefined) {
          fields.push('title = ?');
          values.push(updates.title);
        }
        if (updates.markdown_content !== undefined) {
          fields.push('markdown_content = ?, content = ?, word_count = ?, char_count = ?');
          values.push(
            updates.markdown_content,
            this.stripMarkdown(updates.markdown_content),
            this.countWords(updates.markdown_content),
            updates.markdown_content.length
          );
        }
        if (updates.category !== undefined) {
          fields.push('category = ?');
          values.push(updates.category);
        }
        if (updates.is_favorite !== undefined) {
          fields.push('is_favorite = ?');
          values.push(updates.is_favorite ? 1 : 0);
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        tx.executeSql(
          `UPDATE notes SET ${fields.join(', ')} WHERE id = ?`,
          values,
          () => {
            // Update search index if title or content changed
            if (updates.title !== undefined || updates.markdown_content !== undefined) {
              tx.executeSql(
                'SELECT title, content FROM notes WHERE id = ?',
                [id],
                (_, result) => {
                  if (result.rows.length > 0) {
                    const row = result.rows.item(0);
                    tx.executeSql(
                      'UPDATE notes_search SET searchable_text = ? WHERE note_id = ?',
                      [`${row.title} ${row.content}`.toLowerCase(), id],
                      () => resolve(),
                      (_, error) => {
                        console.error('Failed to update search index:', error);
                        resolve(); // Still resolve even if search index fails
                        return false;
                      }
                    );
                  } else {
                    resolve();
                  }
                }
              );
            } else {
              resolve();
            }
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  async deleteNote(id: number): Promise<void> {
    if (Platform.OS === 'web') {
      this.webNotes.delete(id);
      return;
    }

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          'DELETE FROM notes WHERE id = ?',
          [id],
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  async getNoteById(id: number): Promise<Note | null> {
    if (Platform.OS === 'web') {
      return this.webNotes.get(id) || null;
    }

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM notes WHERE id = ?',
          [id],
          (_, result) => {
            if (result.rows.length === 0) {
              resolve(null);
            } else {
              const row = result.rows.item(0);
              resolve({
                id: row.id,
                title: row.title,
                content: row.content,
                markdown_content: row.markdown_content,
                created_at: row.created_at,
                updated_at: row.updated_at,
                category: row.category,
                is_favorite: row.is_favorite === 1,
                word_count: row.word_count,
                char_count: row.char_count,
              });
            }
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  async getAllNotes(): Promise<Note[]> {
    await this.initialize();
    
    if (Platform.OS === 'web') {
      return Array.from(this.webNotes.values()).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    }

    const result = await this.db!.getAllAsync<{
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

    return result.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      markdown_content: row.markdown_content,
      created_at: row.created_at,
      updated_at: row.updated_at,
      category: row.category,
      is_favorite: row.is_favorite === 1,
      word_count: row.word_count,
      char_count: row.char_count,
    }));
  }

  async searchNotes(query: string): Promise<Note[]> {
    const searchTerm = query.toLowerCase();

    if (Platform.OS === 'web') {
      return Array.from(this.webNotes.values()).filter(note => 
        note.title.toLowerCase().includes(searchTerm) ||
        note.content.toLowerCase().includes(searchTerm)
      );
    }

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          `SELECT n.* FROM notes n
           JOIN notes_search s ON n.id = s.note_id
           WHERE s.searchable_text LIKE ?
           ORDER BY n.updated_at DESC`,
          [`%${searchTerm}%`],
          (_, result) => {
            const notes: Note[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              notes.push({
                id: row.id,
                title: row.title,
                content: row.content,
                markdown_content: row.markdown_content,
                created_at: row.created_at,
                updated_at: row.updated_at,
                category: row.category,
                is_favorite: row.is_favorite === 1,
                word_count: row.word_count,
                char_count: row.char_count,
              });
            }
            resolve(notes);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }
}

// Singleton instance
export const noteManager = new NoteManager();