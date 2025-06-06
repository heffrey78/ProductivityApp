import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { recordingManager } from '../services/RecordingManager';
import { Recording, PlaybackState } from '../types/Recording';

interface RecordingPlayerProps {
  recording: Recording;
  compact?: boolean;
  showTitle?: boolean;
  onDelete?: () => void;
  onFavoriteToggle?: () => void;
}

export const RecordingPlayer: React.FC<RecordingPlayerProps> = ({
  recording,
  compact = false,
  showTitle = true,
  onDelete,
  onFavoriteToggle,
}) => {
  const [playbackState, setPlaybackState] = useState<PlaybackState>(PlaybackState.IDLE);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isSliding, setIsSliding] = useState(false);

  useEffect(() => {
    // Update playback state from manager
    const updatePlaybackState = () => {
      setPlaybackState(recordingManager.getPlaybackState());
    };

    const interval = setInterval(updatePlaybackState, 500);
    return () => clearInterval(interval);
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
            size={24} 
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
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
    marginBottom: theme.spacing.md,
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
    width: 48,
    height: 48,
    borderRadius: 24,
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
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
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
});