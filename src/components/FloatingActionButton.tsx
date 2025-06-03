import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { theme } from '../constants/theme';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: string;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  style?: ViewStyle;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon = '+',
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
        return { ...base, alignSelf: 'center' };
      default:
        return { ...base, right: 20 };
    }
  };

  const getFontSize = () => {
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
      <Text style={[styles.icon, { fontSize: getFontSize() }]}>{icon}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.large,
  },
  icon: {
    color: '#FFFFFF',
    fontWeight: '300',
    textAlign: 'center',
    includeFontPadding: false,
  },
});