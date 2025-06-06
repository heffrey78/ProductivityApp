import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  style?: ViewStyle;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon = 'add',
  size = 'medium',
  color = theme.colors.primary,
  position = 'bottom-right',
  style,
  disabled = false,
  accessibilityLabel = 'Floating action button',
}) => {
  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return { width: 40, height: 40 };
      case 'large':
        return { width: 64, height: 64 };
      default:
        return { width: 56, height: 56 };
    }
  };

  const getPositionStyle = () => {
    const base = { position: 'absolute' as const, bottom: 20 };
    switch (position) {
      case 'bottom-left':
        return { ...base, left: 20 };
      case 'bottom-center':
        return { ...base, alignSelf: 'center' as const };
      default:
        return { ...base, right: 20 };
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 20;
      case 'large':
        return 32;
      default:
        return 28;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getSizeStyle(),
        getPositionStyle(),
        { backgroundColor: disabled ? theme.colors.textTertiary : color },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      activeOpacity={0.8}
    >
      <Ionicons 
        name={icon} 
        size={getIconSize()} 
        color={theme.colors.textInverse} 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.large,
  },
});