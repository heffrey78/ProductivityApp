import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { initWhisper, WhisperContext } from 'whisper.rn';

export enum TranscriptionStatus {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  DOWNLOADING_MODEL = 'downloading_model',
  TRANSCRIBING = 'transcribing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export enum TranscriptionError {
  MODEL_NOT_FOUND = 'model_not_found',
  AUDIO_FORMAT_UNSUPPORTED = 'audio_format_unsupported',
  PROCESSING_FAILED = 'processing_failed',
  INSUFFICIENT_STORAGE = 'insufficient_storage',
  AUDIO_TOO_LONG = 'audio_too_long',
  NETWORK_ERROR = 'network_error',
  INITIALIZATION_FAILED = 'initialization_failed'
}

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  language?: string;
  duration?: number;
}

export interface TranscriptionProgress {
  status: TranscriptionStatus;
  progress?: number; // 0-100
  message?: string;
  error?: TranscriptionError;
}

export class TranscriptionService {
  private whisperContext: WhisperContext | null = null;
  private modelPath: string | null = null;
  private initialized = false;
  private readonly MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin';
  private readonly MODEL_SIZE = 38 * 1024 * 1024; // 38MB
  private progressCallback?: (progress: TranscriptionProgress) => void;

  constructor() {
    // Web platform doesn't support Whisper
    if (Platform.OS === 'web') {
      console.warn('Whisper transcription not supported on web platform');
    }
  }

  setProgressCallback(callback: (progress: TranscriptionProgress) => void) {
    this.progressCallback = callback;
  }

  private notifyProgress(progress: TranscriptionProgress) {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  async initialize(): Promise<void> {
    if (Platform.OS === 'web') {
      throw new Error('Whisper transcription not supported on web platform');
    }

    if (this.initialized) {
      return;
    }

    try {
      this.notifyProgress({ status: TranscriptionStatus.INITIALIZING });

      // Ensure models directory exists
      await this.ensureModelsDirectory();

      // Check if model exists, download if needed
      const modelExists = await this.isModelAvailable();
      if (!modelExists) {
        await this.downloadModel();
      }

      // Initialize Whisper context
      await this.initializeWhisperContext();
      
      this.initialized = true;
      this.notifyProgress({ status: TranscriptionStatus.IDLE });
      
      console.log('TranscriptionService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize TranscriptionService:', error);
      this.notifyProgress({ 
        status: TranscriptionStatus.ERROR, 
        error: TranscriptionError.INITIALIZATION_FAILED 
      });
      throw error;
    }
  }

  private async ensureModelsDirectory(): Promise<string> {
    const modelsDir = `${FileSystem.documentDirectory}models/`;
    
    const dirInfo = await FileSystem.getInfoAsync(modelsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(modelsDir, { intermediates: true });
    }
    
    return modelsDir;
  }

  private async getModelPath(): Promise<string> {
    if (!this.modelPath) {
      const modelsDir = await this.ensureModelsDirectory();
      this.modelPath = `${modelsDir}ggml-tiny.en.bin`;
    }
    return this.modelPath;
  }

  async isModelAvailable(): Promise<boolean> {
    try {
      const modelPath = await this.getModelPath();
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      
      if (!fileInfo.exists) {
        return false;
      }

      // Check if file size is reasonable (should be ~38MB)
      const fileSize = (fileInfo as any).size || 0;
      const expectedSize = this.MODEL_SIZE;
      const sizeTolerance = expectedSize * 0.1; // 10% tolerance
      
      if (Math.abs(fileSize - expectedSize) > sizeTolerance) {
        console.warn(`Model file size unexpected. Expected: ${expectedSize}, Got: ${fileSize}`);
        // Delete corrupted file
        await FileSystem.deleteAsync(modelPath);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking model availability:', error);
      return false;
    }
  }

  async downloadModel(): Promise<void> {
    try {
      this.notifyProgress({ status: TranscriptionStatus.DOWNLOADING_MODEL, progress: 0 });

      const modelPath = await this.getModelPath();

      // Check available storage
      const freeSpace = await FileSystem.getFreeDiskStorageAsync();
      if (freeSpace < this.MODEL_SIZE * 1.5) { // Need 1.5x space for safety
        throw new Error(TranscriptionError.INSUFFICIENT_STORAGE);
      }

      console.log(`Downloading Whisper Tiny model to: ${modelPath}`);

      // Download with progress tracking
      const downloadProgress = (downloadProgressEvent: FileSystem.DownloadProgressData) => {
        const progress = Math.round(
          (downloadProgressEvent.totalBytesWritten / downloadProgressEvent.totalBytesExpectedToWrite) * 100
        );
        this.notifyProgress({ 
          status: TranscriptionStatus.DOWNLOADING_MODEL, 
          progress,
          message: `Downloading model: ${progress}%`
        });
      };

      const downloadResumable = FileSystem.createDownloadResumable(
        this.MODEL_URL,
        modelPath,
        {},
        downloadProgress
      );

      const downloadResult = await downloadResumable.downloadAsync();
      
      if (!downloadResult) {
        throw new Error('Download failed - no result');
      }

      // Verify download
      const isAvailable = await this.isModelAvailable();
      if (!isAvailable) {
        throw new Error('Downloaded model verification failed');
      }

      console.log('Whisper model downloaded successfully');
    } catch (error) {
      console.error('Model download failed:', error);
      this.notifyProgress({ 
        status: TranscriptionStatus.ERROR, 
        error: TranscriptionError.NETWORK_ERROR 
      });
      throw error;
    }
  }

  private async initializeWhisperContext(): Promise<void> {
    try {
      const modelPath = await this.getModelPath();
      
      // Convert file path to the format expected by whisper.rn
      const whisperModelPath = `file://${modelPath}`;
      
      console.log(`Initializing Whisper with model: ${whisperModelPath}`);
      
      // Initialize real whisper.rn context
      this.whisperContext = await initWhisper({
        filePath: whisperModelPath,
      });

      console.log('Whisper context initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Whisper context:', error);
      throw new Error(`Whisper initialization failed: ${error}`);
    }
  }

  async transcribeFile(audioPath: string): Promise<TranscriptionResult> {
    if (Platform.OS === 'web') {
      throw new Error('Whisper transcription not supported on web platform');
    }

    await this.initialize();

    if (!this.whisperContext) {
      throw new Error('Whisper context not initialized');
    }

    try {
      this.notifyProgress({ 
        status: TranscriptionStatus.TRANSCRIBING,
        message: 'Processing audio...'
      });

      console.log(`Transcribing audio file: ${audioPath}`);

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(audioPath);
      if (!fileInfo.exists) {
        throw new Error(TranscriptionError.AUDIO_FORMAT_UNSUPPORTED);
      }

      // Check file size (limit to reasonable size, e.g., 50MB)
      const fileSize = (fileInfo as any).size || 0;
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (fileSize > maxSize) {
        throw new Error(TranscriptionError.AUDIO_TOO_LONG);
      }

      // Perform transcription using whisper.rn
      const startTime = Date.now();
      
      // Convert file path to format expected by whisper.rn
      const whisperAudioPath = audioPath.startsWith('file://') ? audioPath : `file://${audioPath}`;
      
      const { stop, promise } = this.whisperContext.transcribe(whisperAudioPath, {
        language: 'en',
        maxLen: 1,
        tokenTimestamps: false,
        translate: false,
      });

      const { result } = await promise;
      const duration = Date.now() - startTime;

      console.log(`Transcription completed in ${duration}ms`);
      console.log(`Transcribed text: ${result}`);

      const transcriptionResult: TranscriptionResult = {
        text: result.trim(),
        language: 'en',
        duration: duration,
      };

      this.notifyProgress({ status: TranscriptionStatus.COMPLETED });

      return transcriptionResult;
    } catch (error) {
      console.error('Transcription failed:', error);
      this.notifyProgress({ 
        status: TranscriptionStatus.ERROR, 
        error: TranscriptionError.PROCESSING_FAILED 
      });
      throw error;
    }
  }

  async getModelInfo(): Promise<{
    exists: boolean;
    size?: number;
    path?: string;
  }> {
    try {
      const modelPath = await this.getModelPath();
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      
      return {
        exists: fileInfo.exists,
        size: fileInfo.exists ? (fileInfo as any).size : undefined,
        path: modelPath,
      };
    } catch (error) {
      return { exists: false };
    }
  }

  async deleteModel(): Promise<void> {
    try {
      const modelPath = await this.getModelPath();
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(modelPath);
        console.log('Whisper model deleted');
      }
      
      // Reset state
      this.whisperContext = null;
      this.initialized = false;
    } catch (error) {
      console.error('Failed to delete model:', error);
      throw error;
    }
  }

  isSupported(): boolean {
    return Platform.OS !== 'web';
  }

  isInitialized(): boolean {
    return this.initialized && this.whisperContext !== null;
  }

  async getEstimatedTranscriptionTime(audioFileSize: number): Promise<number> {
    // Rough estimate: ~10x real-time on modern devices
    // Assume 1MB ≈ 1 minute of audio, transcription takes ~10x
    const estimatedAudioDuration = audioFileSize / (1024 * 1024); // minutes
    return estimatedAudioDuration * 10 * 1000; // milliseconds
  }
}

// Singleton instance
export const transcriptionService = new TranscriptionService();