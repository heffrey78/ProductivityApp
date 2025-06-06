import { Tag } from './Tag';

export interface Note {
  id: number;
  title: string;
  content: string;
  markdown_content: string;
  created_at: string;
  updated_at: string;
  category: string;
  is_favorite: boolean;
  word_count: number;
  char_count: number;
  tags?: Tag[];
}

export interface CreateNoteRequest {
  title: string;
  markdown_content: string;
  category?: string;
  is_favorite?: boolean;
  tagIds?: number[]; // Array of tag IDs
}

export interface UpdateNoteRequest {
  title?: string;
  markdown_content?: string;
  category?: string;
  is_favorite?: boolean;
  tagIds?: number[]; // Array of tag IDs
}

export interface NoteSearchResult {
  note: Note;
  titleHighlight?: string;
  contentHighlight?: string;
  score: number;
}