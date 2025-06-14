import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { 
  speechRecognitionService, 
  SpeechStatus, 
  SpeechProgress,
  SpeechResult,
  SpeechError
} from '../services/SpeechRecognitionService';

interface SpeechToTextModalProps {
  visible: boolean;
  onClose: () => void;
  onTextCaptured: (text: string) => void;
  title?: string;
  placeholder?: string;
}

export const SpeechToTextModal: React.FC<SpeechToTextModalProps> = ({
  visible,
  onClose,
  onTextCaptured,
  title = "Speech to Text",
  placeholder = "Tap the microphone and start speaking..."
}) => {
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>(SpeechStatus.IDLE);
  const [currentText, setCurrentText] = useState<string>('');
  const [finalText, setFinalText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>('');

  useEffect(() => {
    if (visible) {
      initializeSpeechService();
    } else {
      cleanupSpeechService();
    }

    return () => {
      cleanupSpeechService();
    };
  }, [visible]);

  const initializeSpeechService = async () => {
    try {
      // Set up callbacks
      speechRecognitionService.setProgressCallback(handleProgressUpdate);
      speechRecognitionService.setResultsCallback(handleSpeechResults);
      
      // Initialize the service
      await speechRecognitionService.initialize();
    } catch (error) {
      console.error('Failed to initialize speech service:', error);
      setErrorMessage('Failed to initialize speech recognition');
      setSpeechStatus(SpeechStatus.ERROR);
    }
  };

  const cleanupSpeechService = async () => {
    try {
      if (speechRecognitionService.isCurrentlyListening()) {
        await speechRecognitionService.cancelListening();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  const handleProgressUpdate = (progress: SpeechProgress) => {
    setSpeechStatus(progress.status);
    
    if (progress.error) {
      setErrorMessage(progress.message || 'Speech recognition error');
    } else {
      setErrorMessage('');
    }

    if (progress.message) {
      console.log('Speech progress:', progress.message);
    }
  };

  const handleSpeechResults = (results: SpeechResult[]) => {
    if (results.length > 0) {
      const latestResult = results[0];
      
      if (latestResult.isFinal) {
        setFinalText(latestResult.text);
        setCurrentText('');
      } else {
        setCurrentText(latestResult.text);
      }
    }
  };

  const handleStartListening = async () => {
    if (!speechRecognitionService.isSupported()) {
      Alert.alert('Not Supported', 'Speech recognition is not supported on this platform');
      return;
    }

    try {
      setErrorMessage('');
      setCurrentText('');
      await speechRecognitionService.startListening('en-US');
    } catch (error) {
      console.error('Failed to start listening:', error);
      Alert.alert('Error', 'Failed to start speech recognition. Please check microphone permissions.');
    }
  };

  const handleStopListening = async () => {
    try {
      await speechRecognitionService.stopListening();
    } catch (error) {
      console.error('Failed to stop listening:', error);
    }
  };

  const handleCancelListening = async () => {
    try {
      await speechRecognitionService.cancelListening();
      setCurrentText('');
      setFinalText('');
    } catch (error) {
      console.error('Failed to cancel listening:', error);
    }
  };

  const handleSaveText = () => {
    const textToSave = editMode ? editedText : finalText;
    if (textToSave.trim()) {
      onTextCaptured(textToSave.trim());
      handleClose();
    } else {
      Alert.alert('No Text', 'Please speak something or enter text manually');
    }
  };

  const handleEditText = () => {
    setEditedText(finalText);
    setEditMode(true);
  };

  const handleSaveEdit = () => {
    setFinalText(editedText);
    setEditMode(false);
  };

  const handleCancelEdit = () => {
    setEditedText(finalText);
    setEditMode(false);
  };

  const handleClose = () => {
    cleanupSpeechService();
    setCurrentText('');
    setFinalText('');
    setErrorMessage('');
    setEditMode(false);
    setEditedText('');
    onClose();
  };

  const isListening = speechStatus === SpeechStatus.LISTENING;
  const isProcessing = speechStatus === SpeechStatus.PROCESSING;
  const hasError = speechStatus === SpeechStatus.ERROR;
  const hasText = finalText.trim().length > 0;

  const getMicrophoneIcon = () => {
    if (isListening) return 'mic';
    if (isProcessing) return 'hourglass';
    if (hasError) return 'mic-off';
    return 'mic-outline';
  };

  const getMicrophoneColor = () => {
    if (isListening) return theme.colors.success;
    if (isProcessing) return theme.colors.warning;
    if (hasError) return theme.colors.error;
    return theme.colors.primary;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity 
            onPress={handleSaveText}
            disabled={!hasText && !editMode}
            style={[styles.saveButton, (!hasText && !editMode) && styles.saveButtonDisabled]}
          >
            <Text style={[styles.saveButtonText, (!hasText && !editMode) && styles.saveButtonTextDisabled]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Speech Status */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              {speechStatus === SpeechStatus.IDLE && 'Ready to listen'}
              {speechStatus === SpeechStatus.INITIALIZING && 'Initializing...'}
              {speechStatus === SpeechStatus.LISTENING && 'Listening... Speak now!'}
              {speechStatus === SpeechStatus.PROCESSING && 'Processing speech...'}
              {speechStatus === SpeechStatus.COMPLETED && 'Speech recognition completed'}
              {speechStatus === SpeechStatus.ERROR && `Error: ${errorMessage}`}
            </Text>
          </View>

          {/* Microphone Button */}
          <View style={styles.microphoneContainer}>
            <TouchableOpacity
              style={[styles.microphoneButton, isListening && styles.microphoneButtonActive]}
              onPress={isListening ? handleStopListening : handleStartListening}
              disabled={isProcessing}
            >
              <Ionicons 
                name={getMicrophoneIcon()} 
                size={48} 
                color={theme.colors.surface} 
              />
            </TouchableOpacity>
            
            {isListening && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelListening}
              >
                <Ionicons name="stop" size={24} color={theme.colors.error} />
              </TouchableOpacity>
            )}
          </View>

          {/* Current Speech (Live) */}
          {currentText.length > 0 && (
            <View style={styles.currentTextContainer}>
              <Text style={styles.currentTextLabel}>Listening...</Text>
              <Text style={styles.currentText}>{currentText}</Text>
            </View>
          )}

          {/* Final Text */}
          {hasText && !editMode && (
            <View style={styles.finalTextContainer}>
              <View style={styles.finalTextHeader}>
                <Text style={styles.finalTextLabel}>Recognized Text</Text>
                <TouchableOpacity onPress={handleEditText}>
                  <Ionicons name="pencil" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.finalText}>{finalText}</Text>
            </View>
          )}

          {/* Edit Mode */}
          {editMode && (
            <View style={styles.editContainer}>
              <Text style={styles.editLabel}>Edit Text</Text>
              <TextInput
                style={styles.editInput}
                value={editedText}
                onChangeText={setEditedText}
                multiline
                placeholder="Edit the recognized text..."
                placeholderTextColor={theme.colors.textSecondary}
              />
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.editCancelButton} onPress={handleCancelEdit}>
                  <Text style={styles.editCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editSaveButton} onPress={handleSaveEdit}>
                  <Text style={styles.editSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Error Display */}
          {hasError && errorMessage && (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={20} color={theme.colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Instructions */}
          {!hasText && !isListening && !hasError && (
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsText}>
                {placeholder}
              </Text>
              <Text style={styles.instructionsSubtext}>
                Make sure your microphone is enabled and speak clearly.
              </Text>
            </View>
          )}
        </ScrollView>
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
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
  },
  saveButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  saveButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.surface,
  },
  saveButtonTextDisabled: {
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  statusContainer: {
    marginBottom: theme.spacing.lg,
  },
  statusText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  microphoneContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  microphoneButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.large,
  },
  microphoneButtonActive: {
    backgroundColor: theme.colors.success,
  },
  cancelButton: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.error,
  },
  currentTextContainer: {
    width: '100%',
    backgroundColor: theme.colors.warning + '20',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
  },
  currentTextLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.warning,
    marginBottom: theme.spacing.xs,
  },
  currentText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontStyle: 'italic',
  },
  finalTextContainer: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  finalTextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  finalTextLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.primary,
  },
  finalText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 24,
  },
  editContainer: {
    width: '100%',
    marginBottom: theme.spacing.lg,
  },
  editLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  editInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.md,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  editCancelButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editCancelText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium as any,
  },
  editSaveButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  editSaveText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.surface,
    fontWeight: theme.fontWeight.medium as any,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error + '10',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.error,
  },
  instructionsContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  instructionsText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  instructionsSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});