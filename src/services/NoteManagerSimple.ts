import { Platform } from 'react-native';
import { Note, CreateNoteRequest, UpdateNoteRequest } from '../types/Note';
import { databaseManager } from '../database/database';

export class NoteManagerSimple {
  private webNotes: Map<number, Note> = new Map();
  private nextId = 1;

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
    if (Platform.OS === 'web') {
      // Web implementation
      const plainContent = this.stripMarkdown(noteData.markdown_content);
      const wordCount = this.countWords(noteData.markdown_content);
      const charCount = noteData.markdown_content.length;
      const now = new Date().toISOString();
      
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

    // For now, just store in memory until we get the database migration working
    const plainContent = this.stripMarkdown(noteData.markdown_content);
    const wordCount = this.countWords(noteData.markdown_content);
    const charCount = noteData.markdown_content.length;
    const now = new Date().toISOString();
    
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

  async updateNote(id: number, updates: UpdateNoteRequest): Promise<void> {
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
  }

  async deleteNote(id: number): Promise<void> {
    this.webNotes.delete(id);
  }

  async getNoteById(id: number): Promise<Note | null> {
    return this.webNotes.get(id) || null;
  }

  async getAllNotes(): Promise<Note[]> {
    return Array.from(this.webNotes.values()).sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }

  async searchNotes(query: string): Promise<Note[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.webNotes.values()).filter(note => 
      note.title.toLowerCase().includes(searchTerm) ||
      note.content.toLowerCase().includes(searchTerm)
    );
  }
}

// Singleton instance
export const noteManager = new NoteManagerSimple();