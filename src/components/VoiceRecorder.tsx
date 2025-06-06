import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { recordingManager } from '../services/RecordingManager';
import { Recording, RecordingState, RecordingQuality } from '../types/Recording';

interface VoiceRecorderProps {
  visible: boolean;
  onClose: () => void;
  onRecordingComplete: (recording: Recording) => void;
  initialTitle?: string;
  quality?: RecordingQuality;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  visible,
  onClose,
  onRecordingComplete,
  initialTitle = 'Voice Recording',
  quality = 'MEDIUM',
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE);
  const [title, setTitle] = useState(initialTitle);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (recordingState === RecordingState.RECORDING) {
      interval = setInterval(() => {
        setDuration(prev => prev + 100);
      }, 100);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [recordingState]);

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
      setDuration(0);
      setRecordingState(RecordingState.IDLE);
    }
  }, [visible, initialTitle]);

  const formatDuration = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for the recording');
      return;
    }

    try {
      setIsLoading(true);
      await recordingManager.startRecording(title, quality);
      setRecordingState(RecordingState.RECORDING);
    } catch (error) {
      console.error('Failed to start recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      Alert.alert(
        'Recording Error', 
        errorMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => {
              // For Android, this would open app settings
              if (Platform.OS === 'android') {
                Linking.openSettings();
              }
            }
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsLoading(true);
      const recording = await recordingManager.stopRecording();
      
      if (recording) {
        // Update the recording title if it was changed
        if (recording.title !== title.trim()) {
          await recordingManager.updateRecording(recording.id, { title: title.trim() });
          recording.title = title.trim();
        }
        
        onRecordingComplete(recording);
        onClose();
      }
      
      setRecordingState(RecordingState.IDLE);
      setDuration(0);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseRecording = async () => {
    try {
      await recordingManager.pauseRecording();
      setRecordingState(RecordingState.PAUSED);
    } catch (error) {
      console.error('Failed to pause recording:', error);
      Alert.alert('Error', 'Failed to pause recording');
    }
  };

  const handleResumeRecording = async () => {
    try {
      await recordingManager.resumeRecording();
      setRecordingState(RecordingState.RECORDING);
    } catch (error) {
      console.error('Failed to resume recording:', error);
      Alert.alert('Error', 'Failed to resume recording');
    }
  };

  const handleCancel = () => {
    if (recordingState === RecordingState.RECORDING || recordingState === RecordingState.PAUSED) {
      Alert.alert(
        'Cancel Recording',
        'Are you sure you want to cancel the recording? This action cannot be undone.',
        [
          { text: 'Continue Recording', style: 'cancel' },
          {
            text: 'Cancel Recording',
            style: 'destructive',
            onPress: async () => {
              try {
                await recordingManager.stopRecording();
                setRecordingState(RecordingState.IDLE);
                setDuration(0);
                onClose();
              } catch (error) {
                console.error('Failed to cancel recording:', error);
              }
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  const getRecordingStatusText = (): string => {
    switch (recordingState) {
      case RecordingState.RECORDING:
        return 'Recording...';
      case RecordingState.PAUSED:
        return 'Paused';
      case RecordingState.STOPPED:
        return 'Recording Complete';
      default:
        return 'Ready to Record';
    }
  };

  const getRecordingStatusColor = (): string => {
    switch (recordingState) {
      case RecordingState.RECORDING:
        return theme.colors.error;
      case RecordingState.PAUSED:
        return theme.colors.warning;
      case RecordingState.STOPPED:
        return theme.colors.success;
      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Voice Recording</Text>
          
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <View style={styles.titleSection}>
            <Text style={styles.label}>Recording Title</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter recording title..."
              placeholderTextColor={theme.colors.placeholder}
              editable={recordingState === RecordingState.IDLE}
            />
          </View>

          <View style={styles.recordingSection}>
            <View style={styles.statusContainer}>
              <View 
                style={[
                  styles.statusIndicator, 
                  { backgroundColor: getRecordingStatusColor() }
                ]} 
              />
              <Text style={[styles.statusText, { color: getRecordingStatusColor() }]}>
                {getRecordingStatusText()}
              </Text>
            </View>

            <Text style={styles.durationText}>{formatDuration(duration)}</Text>

            <View style={styles.controlsContainer}>
              {recordingState === RecordingState.IDLE && (
                <TouchableOpacity
                  style={[styles.controlButton, styles.recordButton]}
                  onPress={handleStartRecording}
                  disabled={isLoading || !title.trim()}
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme.colors.surface} />
                  ) : (
                    <Ionicons name="mic" size={32} color={theme.colors.surface} />
                  )}
                </TouchableOpacity>
              )}

              {recordingState === RecordingState.RECORDING && (
                <>
                  <TouchableOpacity
                    style={[styles.controlButton, styles.pauseButton]}
                    onPress={handlePauseRecording}
                  >
                    <Ionicons name="pause" size={24} color={theme.colors.surface} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.controlButton, styles.stopButton]}
                    onPress={handleStopRecording}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={theme.colors.surface} />
                    ) : (
                      <Ionicons name="stop" size={24} color={theme.colors.surface} />
                    )}
                  </TouchableOpacity>
                </>
              )}

              {recordingState === RecordingState.PAUSED && (
                <>
                  <TouchableOpacity
                    style={[styles.controlButton, styles.resumeButton]}
                    onPress={handleResumeRecording}
                  >
                    <Ionicons name="play" size={24} color={theme.colors.surface} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.controlButton, styles.stopButton]}
                    onPress={handleStopRecording}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={theme.colors.surface} />
                    ) : (
                      <Ionicons name="stop" size={24} color={theme.colors.surface} />
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Recording Tips:</Text>
            <Text style={styles.instructionText}>• Find a quiet environment</Text>
            <Text style={styles.instructionText}>• Hold the device close to your mouth</Text>
            <Text style={styles.instructionText}>• Speak clearly and at normal volume</Text>
            <Text style={styles.instructionText}>• Tap the microphone to start recording</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  cancelButton: {
    paddingVertical: theme.spacing.xs,
  },
  cancelButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.error,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
  },
  placeholder: {
    width: 60, // Match cancel button width
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  titleSection: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  titleInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  recordingSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.sm,
  },
  statusText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium as any,
  },
  durationText: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
    fontVariant: ['tabular-nums'],
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.medium,
  },
  recordButton: {
    backgroundColor: theme.colors.error,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  pauseButton: {
    backgroundColor: theme.colors.warning,
  },
  resumeButton: {
    backgroundColor: theme.colors.success,
  },
  stopButton: {
    backgroundColor: theme.colors.textSecondary,
  },
  instructionsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  instructionsTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  instructionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },
});