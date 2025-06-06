export interface Recording {
  id: number;
  title: string;
  file_path: string;
  file_name: string;
  duration: number; // in milliseconds
  file_size: number; // in bytes
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  transcription?: string;
  notes?: string;
}

export interface CreateRecordingRequest {
  title: string;
  file_path: string;
  file_name: string;
  duration?: number;
  file_size?: number;
  is_favorite?: boolean;
  transcription?: string;
  notes?: string;
}

export interface UpdateRecordingRequest {
  title?: string;
  is_favorite?: boolean;
  transcription?: string;
  notes?: string;
}

export interface RecordingWithMetadata extends Recording {
  formattedDuration: string;
  formattedFileSize: string;
  formattedDate: string;
}

// Recording quality settings
export const RECORDING_QUALITY = {
  LOW: {
    android: {
      extension: '.m4a',
      outputFormat: 2, // MPEG_4
      audioEncoder: 3, // AAC
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 64000,
    },
    ios: {
      extension: '.m4a',
      outputFormat: 'mp4',
      audioQuality: 'min',
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 64000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
  },
  MEDIUM: {
    android: {
      extension: '.m4a',
      outputFormat: 2, // MPEG_4
      audioEncoder: 3, // AAC
      sampleRate: 22050,
      numberOfChannels: 1,
      bitRate: 128000,
    },
    ios: {
      extension: '.m4a',
      outputFormat: 'mp4',
      audioQuality: 'medium',
      sampleRate: 22050,
      numberOfChannels: 1,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
  },
  HIGH: {
    android: {
      extension: '.m4a',
      outputFormat: 2, // MPEG_4
      audioEncoder: 3, // AAC
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 256000,
    },
    ios: {
      extension: '.m4a',
      outputFormat: 'mp4',
      audioQuality: 'high',
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 256000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
  },
} as const;

export type RecordingQuality = keyof typeof RECORDING_QUALITY;

// Recording states
export enum RecordingState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}

export enum PlaybackState {
  IDLE = 'idle',
  LOADING = 'loading',
  PLAYING = 'playing',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  ERROR = 'error',
}