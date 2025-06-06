export interface Tag {
  id: number;
  name: string;
  color: string;
  created_at: string;
  usage_count: number;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
}

export interface UpdateTagRequest {
  name?: string;
  color?: string;
}

// Common tag colors
export const TAG_COLORS = [
  '#007AFF', // Blue (default)
  '#FF3B30', // Red
  '#34C759', // Green
  '#FF9500', // Orange
  '#AF52DE', // Purple
  '#5AC8FA', // Light Blue
  '#FFD60A', // Yellow
  '#FF2D55', // Pink
  '#5E5CE6', // Indigo
  '#30D158', // Mint
] as const;

export type TagColor = typeof TAG_COLORS[number];