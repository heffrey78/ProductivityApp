import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
// @ts-ignore - expo-av types may not be available yet
import { Audio } from 'expo-av';
import { dbConnection } from '../database/DatabaseConnection';
import {
  Recording,
  CreateRecordingRequest,
  UpdateRecordingRequest,
  RecordingWithMetadata,
  RECORDING_QUALITY,
  RecordingQuality,
  RecordingState,
  PlaybackState,
} from '../types/Recording';

export class RecordingManager {
  private initialized = false;
  private recordingInstance: Audio.Recording | null = null;
  private soundInstance: Audio.Sound | null = null;
  private recordingState: RecordingState = RecordingState.IDLE;
  private playbackState: PlaybackState = PlaybackState.IDLE;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check current permission status first
      const { status: existingStatus } = await Audio.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      // Only request if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Audio.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.error('Audio recording permission denied');
        throw new Error('Audio recording permission not granted. Please enable microphone access in your device settings.');
      }
      
      console.log('Audio permissions granted successfully');

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Initialize database connection
      if (Platform.OS !== 'web') {
        await dbConnection.initialize();
      }

      // Ensure recordings directory exists
      await this.ensureRecordingsDirectory();

      this.initialized = true;
      console.log('RecordingManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RecordingManager:', error);
      throw error;
    }
  }

  private async ensureRecordingsDirectory(): Promise<string> {
    const recordingsDir = `${FileSystem.documentDirectory}recordings/`;
    
    const dirInfo = await FileSystem.getInfoAsync(recordingsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(recordingsDir, { intermediates: true });
    }
    
    return recordingsDir;
  }

  private generateFileName(title: string, quality: RecordingQuality): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 30);
    const extension = RECORDING_QUALITY[quality].android.extension;
    return `${sanitizedTitle}_${timestamp}${extension}`;
  }

  async startRecording(title: string, quality: RecordingQuality = 'MEDIUM'): Promise<void> {
    await this.initialize();

    if (this.recordingState !== RecordingState.IDLE) {
      throw new Error('Recording already in progress');
    }

    try {
      const recordingsDir = await this.ensureRecordingsDirectory();
      const fileName = this.generateFileName(title, quality);
      const filePath = `${recordingsDir}${fileName}`;

      // Get recording options based on platform and quality
      const qualitySettings = RECORDING_QUALITY[quality];

      // Create new recording instance
      this.recordingInstance = new Audio.Recording();
      
      // Prepare and start recording with platform-specific options
      const androidSettings = qualitySettings.android as any;
      const iosSettings = qualitySettings.ios as any;
      
      const recordingOptions = {
        android: {
          extension: androidSettings.extension,
          outputFormat: androidSettings.outputFormat,
          audioEncoder: androidSettings.audioEncoder,
          sampleRate: androidSettings.sampleRate,
          numberOfChannels: androidSettings.numberOfChannels,
          bitRate: androidSettings.bitRate,
        },
        ios: {
          extension: iosSettings.extension,
          outputFormat: iosSettings.outputFormat,
          audioQuality: iosSettings.audioQuality,
          sampleRate: iosSettings.sampleRate,
          numberOfChannels: iosSettings.numberOfChannels,
          bitRate: iosSettings.bitRate,
          linearPCMBitDepth: iosSettings.linearPCMBitDepth,
          linearPCMIsBigEndian: iosSettings.linearPCMIsBigEndian,
          linearPCMIsFloat: iosSettings.linearPCMIsFloat,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      await this.recordingInstance.prepareToRecordAsync(recordingOptions);

      await this.recordingInstance.startAsync();
      this.recordingState = RecordingState.RECORDING;

      console.log('Recording started:', fileName);
    } catch (error) {
      this.recordingState = RecordingState.IDLE;
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<Recording | null> {
    if (!this.recordingInstance || this.recordingState !== RecordingState.RECORDING) {
      return null;
    }

    try {
      await this.recordingInstance.stopAndUnloadAsync();
      const uri = this.recordingInstance.getURI();
      
      if (!uri) {
        throw new Error('Recording URI is null');
      }

      // Get recording info
      const recordingStatus = await this.recordingInstance.getStatusAsync();
      const fileInfo = await FileSystem.getInfoAsync(uri);

      // Move file to permanent location
      const recordingsDir = await this.ensureRecordingsDirectory();
      const fileName = uri.split('/').pop() || 'recording.m4a';
      const permanentPath = `${recordingsDir}${fileName}`;
      
      await FileSystem.moveAsync({
        from: uri,
        to: permanentPath,
      });

      // Create recording record in database
      const recording = await this.createRecording({
        title: 'Voice Recording',
        file_path: permanentPath,
        file_name: fileName,
        duration: (recordingStatus as any).durationMillis || 0,
        file_size: fileInfo.exists ? (fileInfo as any).size || 0 : 0,
      });

      this.recordingInstance = null;
      this.recordingState = RecordingState.IDLE;

      return recording;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.recordingState = RecordingState.IDLE;
      throw error;
    }
  }

  async pauseRecording(): Promise<void> {
    if (!this.recordingInstance || this.recordingState !== RecordingState.RECORDING) {
      return;
    }

    try {
      await this.recordingInstance.pauseAsync();
      this.recordingState = RecordingState.PAUSED;
    } catch (error) {
      console.error('Failed to pause recording:', error);
      throw error;
    }
  }

  async resumeRecording(): Promise<void> {
    if (!this.recordingInstance || this.recordingState !== RecordingState.PAUSED) {
      return;
    }

    try {
      await this.recordingInstance.startAsync();
      this.recordingState = RecordingState.RECORDING;
    } catch (error) {
      console.error('Failed to resume recording:', error);
      throw error;
    }
  }

  async createRecording(request: CreateRecordingRequest): Promise<Recording> {
    await this.initialize();

    if (Platform.OS === 'web') {
      // For web platform, store in localStorage
      const recordings = this.getWebStorageRecordings();
      const newRecording: Recording = {
        id: Date.now(),
        ...request,
        duration: request.duration || 0,
        file_size: request.file_size || 0,
        is_favorite: request.is_favorite || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      recordings.push(newRecording);
      localStorage.setItem('recordings', JSON.stringify(recordings));
      return newRecording;
    }

    return await dbConnection.runInTransaction(async (db) => {
      const result = await db.runAsync(
        `INSERT INTO recordings (title, file_path, file_name, duration, file_size, is_favorite, transcription, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        request.title,
        request.file_path,
        request.file_name,
        request.duration || 0,
        request.file_size || 0,
        request.is_favorite ? 1 : 0,
        request.transcription || null,
        request.notes || null,
        new Date().toISOString(),
        new Date().toISOString()
      );

      const recording = await db.getFirstAsync<Recording>(
        'SELECT * FROM recordings WHERE id = ?',
        result.lastInsertRowId
      );

      if (!recording) {
        throw new Error('Failed to create recording');
      }

      return {
        ...recording,
        is_favorite: Boolean(recording.is_favorite),
      };
    });
  }

  async getAllRecordings(): Promise<RecordingWithMetadata[]> {
    await this.initialize();

    if (Platform.OS === 'web') {
      const recordings = this.getWebStorageRecordings();
      return recordings.map(this.addMetadata);
    }

    const results = await dbConnection.getAllAsync<{
      id: number;
      title: string;
      file_path: string;
      file_name: string;
      duration: number;
      file_size: number;
      created_at: string;
      updated_at: string;
      is_favorite: number;
      transcription: string | null;
      notes: string | null;
    }>('SELECT * FROM recordings ORDER BY created_at DESC');

    return results.map(row => this.addMetadata({
      ...row,
      is_favorite: Boolean(row.is_favorite),
      transcription: row.transcription || undefined,
      notes: row.notes || undefined,
    }));
  }

  async getRecordingById(id: number): Promise<Recording | null> {
    await this.initialize();

    if (Platform.OS === 'web') {
      const recordings = this.getWebStorageRecordings();
      return recordings.find(r => r.id === id) || null;
    }

    const result = await dbConnection.getFirstAsync<{
      id: number;
      title: string;
      file_path: string;
      file_name: string;
      duration: number;
      file_size: number;
      created_at: string;
      updated_at: string;
      is_favorite: number;
      transcription: string | null;
      notes: string | null;
    }>('SELECT * FROM recordings WHERE id = ?', id);

    if (!result) return null;

    return {
      ...result,
      is_favorite: Boolean(result.is_favorite),
      transcription: result.transcription || undefined,
      notes: result.notes || undefined,
    };
  }

  async updateRecording(id: number, request: UpdateRecordingRequest): Promise<void> {
    await this.initialize();

    if (Platform.OS === 'web') {
      const recordings = this.getWebStorageRecordings();
      const index = recordings.findIndex(r => r.id === id);
      if (index !== -1) {
        recordings[index] = {
          ...recordings[index],
          ...request,
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem('recordings', JSON.stringify(recordings));
      }
      return;
    }

    await dbConnection.runAsync(
      `UPDATE recordings 
       SET title = COALESCE(?, title),
           is_favorite = COALESCE(?, is_favorite),
           transcription = COALESCE(?, transcription),
           notes = COALESCE(?, notes),
           updated_at = ?
       WHERE id = ?`,
      request.title || null,
      request.is_favorite !== undefined ? (request.is_favorite ? 1 : 0) : null,
      request.transcription || null,
      request.notes || null,
      new Date().toISOString(),
      id
    );
  }

  async deleteRecording(id: number): Promise<void> {
    await this.initialize();

    // Get recording to delete file
    const recording = await this.getRecordingById(id);
    if (!recording) return;

    // Delete file if it exists
    try {
      const fileInfo = await FileSystem.getInfoAsync(recording.file_path);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(recording.file_path);
      }
    } catch (error) {
      console.warn('Failed to delete recording file:', error);
    }

    if (Platform.OS === 'web') {
      const recordings = this.getWebStorageRecordings();
      const filtered = recordings.filter(r => r.id !== id);
      localStorage.setItem('recordings', JSON.stringify(filtered));
      return;
    }

    await dbConnection.runAsync('DELETE FROM recordings WHERE id = ?', id);
  }

  private addMetadata(recording: Recording): RecordingWithMetadata {
    return {
      ...recording,
      formattedDuration: this.formatDuration(recording.duration),
      formattedFileSize: this.formatFileSize(recording.file_size),
      formattedDate: new Date(recording.created_at).toLocaleDateString(),
    };
  }

  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  private getWebStorageRecordings(): Recording[] {
    const recordingsJson = localStorage.getItem('recordings');
    return recordingsJson ? JSON.parse(recordingsJson) : [];
  }

  // Playback methods
  async playRecording(recording: Recording): Promise<void> {
    try {
      if (this.soundInstance) {
        await this.soundInstance.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: recording.file_path },
        { shouldPlay: true }
      );

      this.soundInstance = sound;
      this.playbackState = PlaybackState.PLAYING;
      
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          this.playbackState = PlaybackState.STOPPED;
        }
      });
    } catch (error) {
      console.error('Failed to play recording:', error);
      this.playbackState = PlaybackState.ERROR;
      throw error;
    }
  }

  async pausePlayback(): Promise<void> {
    if (this.soundInstance) {
      await this.soundInstance.pauseAsync();
      this.playbackState = PlaybackState.PAUSED;
    }
  }

  async resumePlayback(): Promise<void> {
    if (this.soundInstance) {
      await this.soundInstance.playAsync();
      this.playbackState = PlaybackState.PLAYING;
    }
  }

  async stopPlayback(): Promise<void> {
    if (this.soundInstance) {
      await this.soundInstance.stopAsync();
      this.playbackState = PlaybackState.STOPPED;
    }
  }

  getRecordingState(): RecordingState {
    return this.recordingState;
  }

  getPlaybackState(): PlaybackState {
    return this.playbackState;
  }

  // Note-Recording relationship methods
  async linkRecordingToNote(recordingId: number, noteId: number): Promise<void> {
    await this.initialize();

    if (Platform.OS === 'web') {
      // For web platform, store in localStorage
      const links = this.getWebStorageNoteRecordings();
      const newLink = { note_id: noteId, recording_id: recordingId, created_at: new Date().toISOString() };
      links.push(newLink);
      localStorage.setItem('note_recordings', JSON.stringify(links));
      return;
    }

    await dbConnection.runAsync(
      'INSERT OR IGNORE INTO note_recordings (note_id, recording_id) VALUES (?, ?)',
      noteId,
      recordingId
    );
  }

  async unlinkRecordingFromNote(recordingId: number, noteId: number): Promise<void> {
    await this.initialize();

    if (Platform.OS === 'web') {
      const links = this.getWebStorageNoteRecordings();
      const filtered = links.filter(link => !(link.note_id === noteId && link.recording_id === recordingId));
      localStorage.setItem('note_recordings', JSON.stringify(filtered));
      return;
    }

    await dbConnection.runAsync(
      'DELETE FROM note_recordings WHERE note_id = ? AND recording_id = ?',
      noteId,
      recordingId
    );
  }

  async getRecordingsForNote(noteId: number): Promise<RecordingWithMetadata[]> {
    await this.initialize();

    if (Platform.OS === 'web') {
      const links = this.getWebStorageNoteRecordings();
      const recordings = this.getWebStorageRecordings();
      const linkedRecordingIds = links
        .filter(link => link.note_id === noteId)
        .map(link => link.recording_id);
      
      return recordings
        .filter(recording => linkedRecordingIds.includes(recording.id))
        .map(this.addMetadata);
    }

    const results = await dbConnection.getAllAsync<{
      id: number;
      title: string;
      file_path: string;
      file_name: string;
      duration: number;
      file_size: number;
      created_at: string;
      updated_at: string;
      is_favorite: number;
      transcription: string | null;
      notes: string | null;
    }>(`
      SELECT r.* 
      FROM recordings r
      INNER JOIN note_recordings nr ON r.id = nr.recording_id
      WHERE nr.note_id = ?
      ORDER BY r.created_at DESC
    `, noteId);

    return results.map(row => this.addMetadata({
      ...row,
      is_favorite: Boolean(row.is_favorite),
      transcription: row.transcription || undefined,
      notes: row.notes || undefined,
    }));
  }

  private getWebStorageNoteRecordings(): Array<{note_id: number, recording_id: number, created_at: string}> {
    const linksJson = localStorage.getItem('note_recordings');
    return linksJson ? JSON.parse(linksJson) : [];
  }
}

// Singleton instance
export const recordingManager = new RecordingManager();