import { Task } from '../database/database';
import { Note } from './Note';

export interface TaskNote {
  task_id: number;
  note_id: number;
  created_at: string;
}

export interface TaskWithNotes extends Task {
  linkedNotes?: Note[];
}

export interface NoteWithTasks extends Note {
  linkedTasks?: Task[];
}

export interface LinkTaskNoteRequest {
  taskId: number;
  noteId: number;
}

export interface CreateTaskFromNoteRequest {
  noteId: number;
  title: string;
  description?: string;
  selectedText?: string;
}