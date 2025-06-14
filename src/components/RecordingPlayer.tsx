import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { recordingManager } from '../services/RecordingManager';
import { Recording, PlaybackState } from '../types/Recording';
import { 
  transcriptionService, 
  TranscriptionStatus, 
  TranscriptionProgress,
  TranscriptionResult 
} from '../services/TranscriptionService';
import { settingsService } from '../services/SettingsService';

interface RecordingPlayerProps {
  recording: Recording;
  compact?: boolean;
  showTitle?: boolean;
  onDelete?: () => void;
  onFavoriteToggle?: () => void;
  onTranscriptionUpdate?: (recordingId: number, transcription: string) => void;
}

export const RecordingPlayer: React.FC<RecordingPlayerProps> = ({
  recording,
  compact = false,
  showTitle = true,
  onDelete,
  onFavoriteToggle,
  onTranscriptionUpdate,
}) => {
  const [playbackState, setPlaybackState] = useState<PlaybackState>(PlaybackState.IDLE);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  
  // Transcription state
  const [transcriptionStatus, setTranscriptionStatus] = useState<TranscriptionStatus>(TranscriptionStatus.IDLE);
  const [transcriptionProgress, setTranscriptionProgress] = useState<number>(0);
  const [transcriptionMessage, setTranscriptionMessage] = useState<string>('');
  const [editingTranscription, setEditingTranscription] = useState(false);
  const [editedTranscription, setEditedTranscription] = useState(recording.transcription || '');
  const [isTranscriptionExpanded, setIsTranscriptionExpanded] = useState(false);
  const [autoTranscribeEnabled, setAutoTranscribeEnabled] = useState(false);

  useEffect(() => {
    // Update playback state from manager
    const updatePlaybackState = () => {
      setPlaybackState(recordingManager.getPlaybackState());
    };

    const interval = setInterval(updatePlaybackState, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Load auto-transcription setting
    const loadAutoTranscriptionSetting = async () => {
      try {
        const enabled = await settingsService.getSetting('autoTranscribeRecordings');
        setAutoTranscribeEnabled(enabled);
      } catch (error) {
        console.error('Failed to load auto-transcription setting:', error);
      }
    };
    
    loadAutoTranscriptionSetting();
  }, []);

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    try {
      if (playbackState === PlaybackState.PLAYING) {
        await recordingManager.pausePlayback();
        setPlaybackState(PlaybackState.PAUSED);
      } else if (playbackState === PlaybackState.PAUSED) {
        await recordingManager.resumePlayback();
        setPlaybackState(PlaybackState.PLAYING);
      } else {
        await recordingManager.playRecording(recording);
        setPlaybackState(PlaybackState.PLAYING);
      }
    } catch (error) {
      console.error('Failed to control playback:', error);
      Alert.alert('Error', 'Failed to play recording');
    }
  };

  const handleStop = async () => {
    try {
      await recordingManager.stopPlayback();
      setPlaybackState(PlaybackState.STOPPED);
      setCurrentPosition(0);
    } catch (error) {
      console.error('Failed to stop playback:', error);
    }
  };

  const handleSliderChange = (value: number) => {
    if (!isSliding) return;
    setCurrentPosition(value);
  };

  const handleSliderComplete = async (value: number) => {
    setIsSliding(false);
    // Note: expo-av doesn't directly support seeking, 
    // this would need additional implementation
  };

  const handleDelete = () => {
    if (onDelete) {
      Alert.alert(
        'Delete Recording',
        'Are you sure you want to delete this recording? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: onDelete,
          },
        ]
      );
    }
  };

  const handleFavoriteToggle = () => {
    if (onFavoriteToggle) {
      onFavoriteToggle();
    }
  };

  const handleTranscribe = async () => {
    if (!transcriptionService.isSupported()) {
      Alert.alert('Not Supported', 'Speech-to-text is not supported on this platform');
      return;
    }

    if (!recording.id) {
      Alert.alert('Error', 'Cannot transcribe: Recording ID is missing');
      return;
    }

    try {
      setTranscriptionStatus(TranscriptionStatus.INITIALIZING);
      setTranscriptionMessage('Preparing transcription...');

      // Set up progress callback
      transcriptionService.setProgressCallback((progress: TranscriptionProgress) => {
        setTranscriptionStatus(progress.status);
        setTranscriptionProgress(progress.progress || 0);
        setTranscriptionMessage(progress.message || '');
      });

      // Start transcription
      const result: TranscriptionResult = await transcriptionService.transcribeFile(recording.file_path);
      
      // Update local state
      setEditedTranscription(result.text);
      
      // Save to database via callback
      if (onTranscriptionUpdate) {
        await onTranscriptionUpdate(recording.id, result.text);
      }

      setTranscriptionStatus(TranscriptionStatus.COMPLETED);
      setTranscriptionMessage('Transcription completed!');
      
      Alert.alert('Success', 'Audio transcribed successfully!');
    } catch (error) {
      console.error('Transcription failed:', error);
      setTranscriptionStatus(TranscriptionStatus.ERROR);
      setTranscriptionMessage('Transcription failed');
      
      Alert.alert(
        'Transcription Failed', 
        'Failed to transcribe audio. Please try again or check if the Whisper model is available.',
        [
          { text: 'OK' },
          { 
            text: 'Download Model', 
            onPress: () => handleDownloadModel() 
          }
        ]
      );
    }
  };

  const handleDownloadModel = async () => {
    try {
      setTranscriptionStatus(TranscriptionStatus.DOWNLOADING_MODEL);
      setTranscriptionMessage('Downloading speech model...');
      
      transcriptionService.setProgressCallback((progress: TranscriptionProgress) => {
        setTranscriptionStatus(progress.status);
        setTranscriptionProgress(progress.progress || 0);
        setTranscriptionMessage(progress.message || '');
      });

      await transcriptionService.downloadModel();
      
      setTranscriptionStatus(TranscriptionStatus.IDLE);
      Alert.alert('Success', 'Speech model downloaded successfully! You can now transcribe recordings.');
    } catch (error) {
      console.error('Model download failed:', error);
      setTranscriptionStatus(TranscriptionStatus.ERROR);
      Alert.alert('Download Failed', 'Failed to download speech model. Please check your internet connection.');
    }
  };

  const handleEditTranscription = () => {
    setEditingTranscription(true);
  };

  const handleSaveTranscription = async () => {
    if (!recording.id || !onTranscriptionUpdate) return;
    
    try {
      await onTranscriptionUpdate(recording.id, editedTranscription);
      setEditingTranscription(false);
      Alert.alert('Success', 'Transcription updated successfully!');
    } catch (error) {
      console.error('Failed to save transcription:', error);
      Alert.alert('Error', 'Failed to save transcription changes');
    }
  };

  const handleCancelEdit = () => {
    setEditedTranscription(recording.transcription || '');
    setEditingTranscription(false);
  };

  const handleAutoTranscribeToggle = async () => {
    try {
      const newValue = !autoTranscribeEnabled;
      await settingsService.setSetting('autoTranscribeRecordings', newValue);
      setAutoTranscribeEnabled(newValue);
      
      Alert.alert(
        'Auto-Transcription',
        newValue 
          ? 'New recordings will be automatically transcribed when saved.'
          : 'Auto-transcription has been disabled. You can still transcribe recordings manually.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to update auto-transcription setting:', error);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const getPlayIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (playbackState) {
      case PlaybackState.PLAYING:
        return 'pause';
      case PlaybackState.LOADING:
        return 'hourglass';
      default:
        return 'play';
    }
  };

  const isPlaying = playbackState === PlaybackState.PLAYING;
  const isLoading = playbackState === PlaybackState.LOADING;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <TouchableOpacity
          style={styles.compactPlayButton}
          onPress={handlePlayPause}
          disabled={isLoading}
        >
          <Ionicons 
            name={getPlayIcon()} 
            size={16} 
            color={theme.colors.primary} 
          />
        </TouchableOpacity>
        
        <View style={styles.compactInfo}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {recording.title}
          </Text>
          <Text style={styles.compactDuration}>
            {formatTime(recording.duration)}
          </Text>
        </View>
        
        {recording.is_favorite && (
          <Ionicons name="star" size={14} color={theme.colors.warning} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showTitle && (
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {recording.title}
            </Text>
            <Text style={styles.metadata}>
              {formatTime(recording.duration)} • {new Date(recording.created_at).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleFavoriteToggle}
            >
              <Ionicons
                name={recording.is_favorite ? 'star' : 'star-outline'}
                size={20}
                color={recording.is_favorite ? theme.colors.warning : theme.colors.textSecondary}
              />
            </TouchableOpacity>
            
            {onDelete && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDelete}
              >
                <Ionicons name="trash" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={styles.playerContainer}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
          disabled={isLoading}
        >
          <Ionicons 
            name={getPlayIcon()} 
            size={20} 
            color={theme.colors.surface} 
          />
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>
            {formatTime(currentPosition)}
          </Text>
          
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(currentPosition / recording.duration) * 100}%` }
              ]} 
            />
          </View>
          
          <Text style={styles.timeText}>
            {formatTime(recording.duration)}
          </Text>
        </View>

        {(isPlaying || playbackState === PlaybackState.PAUSED) && (
          <TouchableOpacity
            style={styles.stopButton}
            onPress={handleStop}
          >
            <Ionicons name="stop" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {recording.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesText} numberOfLines={3}>
            {recording.notes}
          </Text>
        </View>
      )}

      {/* Transcription Section */}
      {!compact && transcriptionService.isSupported() && (
        <View style={styles.transcriptionContainer}>
          <TouchableOpacity 
            style={styles.transcriptionHeader}
            onPress={() => setIsTranscriptionExpanded(!isTranscriptionExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.transcriptionHeaderLeft}>
              <Ionicons 
                name={isTranscriptionExpanded ? "chevron-down" : "chevron-forward"} 
                size={16} 
                color={theme.colors.textSecondary} 
              />
              <Text style={styles.transcriptionTitle}>Transcription</Text>
              {recording.transcription && (
                <View style={styles.transcriptionStatusBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={theme.colors.success} />
                </View>
              )}
            </View>
            
            {isTranscriptionExpanded && (
              <View style={styles.transcriptionActions}>
                {!recording.transcription && transcriptionStatus === TranscriptionStatus.IDLE && (
                  <TouchableOpacity
                    style={styles.transcribeButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleTranscribe();
                    }}
                  >
                    <Ionicons name="mic" size={16} color={theme.colors.surface} />
                    <Text style={styles.transcribeButtonText}>Transcribe</Text>
                  </TouchableOpacity>
                )}

                {recording.transcription && !editingTranscription && (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleEditTranscription();
                    }}
                  >
                    <Ionicons name="pencil" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Collapsible Content */}
          {isTranscriptionExpanded && (
            <>
              {/* Loading State */}
              {(transcriptionStatus === TranscriptionStatus.INITIALIZING ||
                transcriptionStatus === TranscriptionStatus.DOWNLOADING_MODEL ||
                transcriptionStatus === TranscriptionStatus.TRANSCRIBING) && (
                <View style={styles.transcriptionLoading}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.transcriptionMessage}>
                    {transcriptionMessage}
                  </Text>
                  {transcriptionProgress > 0 && (
                    <View style={styles.transcriptionProgressContainer}>
                      <View style={styles.transcriptionProgressBarContainer}>
                        <View 
                          style={[
                            styles.transcriptionProgressBar, 
                            { width: `${transcriptionProgress}%` }
                          ]} 
                        />
                      </View>
                      <Text style={styles.progressText}>{transcriptionProgress}%</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Transcription Text */}
              {(recording.transcription || editedTranscription) && !editingTranscription && (
                <View style={styles.transcriptionTextContainer}>
                  <Text style={styles.transcriptionText}>
                    {recording.transcription || editedTranscription}
                  </Text>
                </View>
              )}

              {/* Edit Mode */}
              {editingTranscription && (
                <View style={styles.transcriptionEditContainer}>
                  <TextInput
                    style={styles.transcriptionInput}
                    value={editedTranscription}
                    onChangeText={setEditedTranscription}
                    multiline
                    placeholder="Enter transcription text..."
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                  <View style={styles.transcriptionEditActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleCancelEdit}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleSaveTranscription}
                    >
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Error State */}
              {transcriptionStatus === TranscriptionStatus.ERROR && (
                <View style={styles.transcriptionError}>
                  <Ionicons name="warning" size={16} color={theme.colors.error} />
                  <Text style={styles.transcriptionErrorText}>
                    {transcriptionMessage || 'Transcription failed'}
                  </Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={handleTranscribe}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Auto-Transcription Setting */}
              <View style={styles.settingsContainer}>
                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={handleAutoTranscribeToggle}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>Auto-transcribe new recordings</Text>
                    <Text style={styles.settingDescription}>
                      Automatically transcribe recordings when saved
                    </Text>
                  </View>
                  <View style={[
                    styles.toggleSwitch, 
                    autoTranscribeEnabled && styles.toggleSwitchActive
                  ]}>
                    <View style={[
                      styles.toggleThumb,
                      autoTranscribeEnabled && styles.toggleThumbActive
                    ]} />
                  </View>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  titleContainer: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  metadata: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    padding: theme.spacing.xs,
  },
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.small,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  timeText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontVariant: ['tabular-nums'],
    minWidth: 40,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  stopButton: {
    padding: theme.spacing.sm,
  },
  notesContainer: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  notesText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  compactPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  compactInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  compactTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.text,
    marginBottom: 2,
  },
  compactDuration: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  // Transcription styles
  transcriptionContainer: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  transcriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    marginHorizontal: -theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  transcriptionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flex: 1,
  },
  transcriptionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  transcriptionStatusBadge: {
    marginLeft: theme.spacing.xs,
  },
  transcriptionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
  },
  transcribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  transcribeButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.surface,
  },
  editButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  transcriptionLoading: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  transcriptionMessage: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  transcriptionProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: theme.spacing.sm,
  },
  transcriptionProgressBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  transcriptionProgressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontVariant: ['tabular-nums'],
    minWidth: 35,
  },
  transcriptionTextContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.sm,
  },
  transcriptionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  transcriptionEditContainer: {
    gap: theme.spacing.sm,
  },
  transcriptionInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  transcriptionEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium as any,
  },
  saveButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  saveButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.surface,
    fontWeight: theme.fontWeight.medium as any,
  },
  transcriptionError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error + '10',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  transcriptionErrorText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.error,
  },
  retryButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.error,
  },
  retryButtonText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.surface,
    fontWeight: theme.fontWeight.medium as any,
  },
  // Settings styles
  settingsContainer: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  settingInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  settingTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs / 2,
  },
  settingDescription: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
});