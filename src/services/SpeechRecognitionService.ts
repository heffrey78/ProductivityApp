import { Platform, Alert } from 'react-native';

export enum SpeechStatus {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  LISTENING = 'listening',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export enum SpeechError {
  PERMISSION_DENIED = 'permission_denied',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  NETWORK_ERROR = 'network_error',
  NO_MATCH = 'no_match',
  INITIALIZATION_FAILED = 'initialization_failed'
}

export interface SpeechResult {
  text: string;
  confidence?: number;
  isFinal: boolean;
}

export interface SpeechProgress {
  status: SpeechStatus;
  message?: string;
  error?: SpeechError;
  results?: SpeechResult[];
}

export class SpeechRecognitionService {
  private initialized = false;
  private isListening = false;
  private progressCallback?: (progress: SpeechProgress) => void;
  private resultsCallback?: (results: SpeechResult[]) => void;
  private currentResults: string[] = [];

  constructor() {
    // Web platform doesn't support expo-speech-recognition
    if (Platform.OS === 'web') {
      console.warn('Speech recognition not supported on web platform');
    }
  }

  setProgressCallback(callback: (progress: SpeechProgress) => void) {
    this.progressCallback = callback;
  }

  setResultsCallback(callback: (results: SpeechResult[]) => void) {
    this.resultsCallback = callback;
  }

  private notifyProgress(progress: SpeechProgress) {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  private notifyResults(results: SpeechResult[]) {
    if (this.resultsCallback) {
      this.resultsCallback(results);
    }
  }

  async initialize(): Promise<void> {
    if (Platform.OS === 'web') {
      throw new Error('Speech recognition not supported on web platform');
    }

    if (this.initialized) {
      return;
    }

    try {
      this.notifyProgress({ status: SpeechStatus.INITIALIZING });

      // Since we removed expo-speech-recognition for offline-first approach,
      // we now provide a fallback that suggests using recording + transcription
      this.initialized = true;
      this.notifyProgress({ status: SpeechStatus.IDLE });
      
      console.log('SpeechRecognitionService initialized (offline mode)');
    } catch (error) {
      console.error('Failed to initialize SpeechRecognitionService:', error);
      this.notifyProgress({ 
        status: SpeechStatus.ERROR, 
        error: SpeechError.INITIALIZATION_FAILED,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async startListening(locale: string = 'en-US'): Promise<void> {
    if (Platform.OS === 'web') {
      throw new Error('Speech recognition not supported on web platform');
    }

    await this.initialize();

    if (this.isListening) {
      console.warn('Already listening for speech');
      return;
    }

    try {
      // Since we're now offline-first, show an alert directing users to use recording
      Alert.alert(
        'Speech to Text Unavailable',
        'Live speech recognition has been disabled in favor of offline transcription. Please use the voice recorder instead and transcribe your recordings for the best privacy and accuracy.',
        [
          { text: 'OK', style: 'default' }
        ]
      );

      this.notifyProgress({ 
        status: SpeechStatus.ERROR, 
        error: SpeechError.SERVICE_UNAVAILABLE,
        message: 'Live speech recognition not available. Use voice recording instead.'
      });

      throw new Error('Live speech recognition not available in offline mode');
    } catch (error) {
      console.error('Speech recognition not available:', error);
      this.isListening = false;
      this.notifyProgress({ 
        status: SpeechStatus.ERROR, 
        error: SpeechError.SERVICE_UNAVAILABLE,
        message: 'Live speech recognition not available. Use voice recording instead.'
      });
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    this.isListening = false;
    console.log('Stopped listening for speech (offline mode)');
  }

  async cancelListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    this.isListening = false;
    this.currentResults = [];
    this.notifyProgress({ status: SpeechStatus.IDLE });
    console.log('Cancelled speech recognition (offline mode)');
  }

  // Utility methods
  isSupported(): boolean {
    return Platform.OS !== 'web';
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getCurrentResults(): string[] {
    return this.currentResults;
  }

  getBestResult(): string {
    return this.currentResults.length > 0 ? this.currentResults[0] : '';
  }

  async getAvailableLocales(): Promise<string[]> {
    // Return default locales for offline mode
    return ['en-US', 'en-GB', 'es-US', 'fr-FR', 'de-DE'];
  }

  async destroy(): Promise<void> {
    try {
      if (this.isListening) {
        await this.cancelListening();
      }
      
      this.initialized = false;
      console.log('SpeechRecognitionService destroyed');
    } catch (error) {
      console.error('Failed to destroy SpeechRecognitionService:', error);
    }
  }
}

// Singleton instance
export const speechRecognitionService = new SpeechRecognitionService();