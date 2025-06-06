import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { theme } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: keyof typeof theme.spacing;
  margin?: keyof typeof theme.spacing;
  onPress?: TouchableOpacityProps['onPress'];
  activeOpacity?: number;
  disabled?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  padding = 'md',
  margin,
  onPress,
  activeOpacity = 0.7,
  disabled = false,
}) => {
  const cardStyle = [
    styles.base,
    styles[variant],
    { padding: theme.spacing[padding] },
    margin && { margin: theme.spacing[margin] },
    disabled && styles.disabled,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={activeOpacity}
        disabled={disabled}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  
  default: {
    ...theme.shadows.small,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  
  elevated: {
    ...theme.shadows.medium,
  },
  
  outlined: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'transparent',
  },
  
  filled: {
    backgroundColor: theme.colors.background,
  },
  
  disabled: {
    opacity: 0.5,
  },
});