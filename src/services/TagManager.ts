import { Platform } from 'react-native';
import { Tag, CreateTagRequest, UpdateTagRequest } from '../types/Tag';
import { dbConnection } from '../database/DatabaseConnection';

export class TagManager {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized || Platform.OS === 'web') return;

    try {
      await dbConnection.initialize();
      this.initialized = true;
      console.log('TagManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize TagManager:', error);
      throw error;
    }
  }

  async createTag(tagData: CreateTagRequest): Promise<Tag> {
    await this.initialize();

    console.log('TagManager: Creating tag with data:', tagData);

    const now = new Date().toISOString();

    try {
      const result = await dbConnection.runAsync(
        'INSERT INTO tags (name, color, created_at, usage_count) VALUES (?, ?, ?, ?)',
        tagData.name.toLowerCase().trim(),
        tagData.color || '#007AFF',
        now,
        0
      );

      console.log('TagManager: Insert result:', result);

      const newTag = {
        id: result.lastInsertRowId as number,
        name: tagData.name.toLowerCase().trim(),
        color: tagData.color || '#007AFF',
        created_at: now,
        usage_count: 0,
      };

      console.log('TagManager: Successfully created tag:', newTag);
      return newTag;
    } catch (error: any) {
      console.error('TagManager: Failed to create tag:', error);
      if (error.message?.includes('UNIQUE constraint failed')) {
        throw new Error('Tag already exists');
      }
      throw error;
    }
  }

  async updateTag(id: number, updates: UpdateTagRequest): Promise<void> {
    await this.initialize();

    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      values.push(updates.name.toLowerCase().trim());
    }

    if (updates.color !== undefined) {
      setClauses.push('color = ?');
      values.push(updates.color);
    }

    if (setClauses.length === 0) return;

    const query = `UPDATE tags SET ${setClauses.join(', ')} WHERE id = ?`;
    values.push(id);

    await dbConnection.runAsync(query, ...values);
  }

  async deleteTag(id: number): Promise<void> {
    await this.initialize();

    await dbConnection.runAsync('DELETE FROM tags WHERE id = ?', id);
  }

  async getTagById(id: number): Promise<Tag | null> {
    await this.initialize();

    const result = await dbConnection.getFirstAsync<Tag>(
      'SELECT * FROM tags WHERE id = ?',
      id
    );

    return result || null;
  }

  async getTagByName(name: string): Promise<Tag | null> {
    await this.initialize();

    const result = await dbConnection.getFirstAsync<Tag>(
      'SELECT * FROM tags WHERE name = ?',
      name.toLowerCase().trim()
    );

    return result || null;
  }

  async getAllTags(): Promise<Tag[]> {
    await this.initialize();

    const results = await dbConnection.getAllAsync<Tag>(
      'SELECT * FROM tags ORDER BY usage_count DESC, name ASC'
    );

    return results;
  }

  async searchTags(query: string): Promise<Tag[]> {
    await this.initialize();

    const searchTerm = `%${query.toLowerCase()}%`;
    
    const results = await dbConnection.getAllAsync<Tag>(
      'SELECT * FROM tags WHERE name LIKE ? ORDER BY usage_count DESC, name ASC',
      searchTerm
    );

    return results;
  }

  async addTagsToNote(noteId: number, tagIds: number[]): Promise<void> {
    await this.initialize();

    console.log('TagManager: Adding tags to note:', { noteId, tagIds });

    // Validate inputs
    if (!noteId || noteId <= 0) {
      throw new Error(`Invalid noteId: ${noteId}`);
    }

    const validTagIds = tagIds.filter(id => id && id > 0);
    if (validTagIds.length !== tagIds.length) {
      console.warn('TagManager: Some invalid tag IDs filtered out:', { original: tagIds, valid: validTagIds });
    }

    try {
      // Remove existing tags
      await dbConnection.runAsync('DELETE FROM note_tags WHERE note_id = ?', noteId);
      console.log('TagManager: Removed existing tags for note:', noteId);

      // Add new tags
      if (validTagIds.length > 0) {
        const now = new Date().toISOString();
        
        // Use parameterized queries for each tag
        for (const tagId of validTagIds) {
          await dbConnection.runAsync(
            'INSERT INTO note_tags (note_id, tag_id, created_at) VALUES (?, ?, ?)',
            noteId,
            tagId,
            now
          );
          console.log('TagManager: Added tag to note:', { noteId, tagId });
        }

        // Update usage count for all tags
        for (const tagId of validTagIds) {
          await dbConnection.runAsync(
            'UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?',
            tagId
          );
        }
        console.log('TagManager: Updated usage counts for tags:', validTagIds);
      } else {
        console.log('TagManager: No tags to add');
      }
      
      console.log('TagManager: Successfully added tags to note:', { noteId, tagIds: validTagIds });
    } catch (error) {
      console.error('TagManager: Failed to add tags to note:', error);
      console.error('TagManager: Error details:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async getTagsForNote(noteId: number): Promise<Tag[]> {
    await this.initialize();

    console.log('TagManager: Getting tags for note:', noteId);

    // First check if note_tags entries exist
    const noteTagResults = await dbConnection.getAllAsync<{note_id: number, tag_id: number}>(
      'SELECT note_id, tag_id FROM note_tags WHERE note_id = ?',
      noteId
    );
    console.log('TagManager: Found note_tags entries:', noteTagResults);

    // Then get the actual tag data
    const results = await dbConnection.getAllAsync<Tag>(
      `SELECT t.* FROM tags t 
       JOIN note_tags nt ON t.id = nt.tag_id 
       WHERE nt.note_id = ? 
       ORDER BY t.name`,
      noteId
    );

    console.log('TagManager: Found tags for note:', { noteId, tags: results });
    return results;
  }

  async getNotesForTag(tagId: number): Promise<number[]> {
    await this.initialize();

    const results = await dbConnection.getAllAsync<{ note_id: number }>(
      'SELECT note_id FROM note_tags WHERE tag_id = ?',
      tagId
    );

    return results.map(r => r.note_id);
  }

  async getOrCreateTag(name: string, color?: string): Promise<Tag> {
    console.log('TagManager: Getting or creating tag:', { name, color });
    
    try {
      const existingTag = await this.getTagByName(name);
      if (existingTag) {
        console.log('TagManager: Found existing tag:', existingTag);
        return existingTag;
      }

      console.log('TagManager: Creating new tag:', { name, color });
      const newTag = await this.createTag({ name, color });
      console.log('TagManager: Created new tag:', newTag);
      return newTag;
    } catch (error) {
      console.error('TagManager: Failed to get or create tag:', error);
      throw error;
    }
  }

  async getPopularTags(limit: number = 10): Promise<Tag[]> {
    await this.initialize();

    const results = await dbConnection.getAllAsync<Tag>(
      'SELECT * FROM tags ORDER BY usage_count DESC LIMIT ?',
      limit
    );

    return results;
  }
}

// Singleton instance
export const tagManager = new TagManager();