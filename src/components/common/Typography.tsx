import React from 'react';
import { Text as RNText, StyleSheet, TextStyle } from 'react-native';
import { theme } from '../../constants/theme';

interface TypographyProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body1' | 'body2' | 'caption' | 'overline';
  color?: keyof typeof theme.colors;
  weight?: keyof typeof theme.fontWeight;
  align?: 'left' | 'center' | 'right' | 'justify';
  numberOfLines?: number;
  style?: TextStyle;
  onPress?: () => void;
}

export const Typography: React.FC<TypographyProps> = ({
  children,
  variant = 'body1',
  color = 'text',
  weight,
  align = 'left',
  numberOfLines,
  style,
  onPress,
}) => {
  const textStyle = [
    styles.base,
    styles[variant],
    { color: theme.colors[color] },
    weight && { fontWeight: theme.fontWeight[weight] },
    { textAlign: align },
    style,
  ];

  return (
    <RNText
      style={textStyle}
      numberOfLines={numberOfLines}
      onPress={onPress}
    >
      {children}
    </RNText>
  );
};

// Specific text components for convenience
export const Heading1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h1" {...props} />
);

export const Heading2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h2" {...props} />
);

export const Heading3: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h3" {...props} />
);

export const Heading4: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h4" {...props} />
);

export const Body1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body1" {...props} />
);

export const Body2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body2" {...props} />
);

export const Caption: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="caption" {...props} />
);

export const Overline: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="overline" {...props} />
);

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  
  h1: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  
  h2: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    lineHeight: 32,
    letterSpacing: -0.25,
  },
  
  h3: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    lineHeight: 28,
    letterSpacing: 0,
  },
  
  h4: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    lineHeight: 24,
    letterSpacing: 0.25,
  },
  
  body1: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.regular,
    lineHeight: 20,
    letterSpacing: 0.5,
  },
  
  body2: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.regular,
    lineHeight: 18,
    letterSpacing: 0.25,
  },
  
  caption: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.regular,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  
  overline: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});