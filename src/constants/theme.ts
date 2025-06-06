import { Platform, Appearance } from 'react-native';

const colorScheme = Appearance.getColorScheme();

const lightColors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#5AC8FA',
  
  background: '#F5F5F5',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  
  text: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',
  
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  placeholder: '#C7C7CC',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  shadow: Platform.OS === 'ios' ? '#000000' : '#666666',
};

const darkColors = {
  primary: '#0A84FF',
  secondary: '#5E5CE6',
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  info: '#64D2FF',
  
  background: '#1C1C1E',
  surface: '#2C2C2E',
  card: '#3A3A3C',
  
  text: '#FFFFFF',
  textSecondary: '#AEAEB2',
  textTertiary: '#8E8E93',
  textInverse: '#000000',
  
  border: '#3A3A3C',
  borderLight: '#48484A',
  placeholder: '#8E8E93',
  overlay: 'rgba(0, 0, 0, 0.7)',
  
  shadow: '#000000',
};

export const theme = {
  colors: colorScheme === 'dark' ? darkColors : lightColors,
  
  isDark: colorScheme === 'dark',
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 24,
    xxxl: 32,
  },
  
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 28,
    full: 9999,
  },
  
  shadows: {
    none: {},
    small: {
      shadowColor: colorScheme === 'dark' ? '#000000' : '#000000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    medium: {
      shadowColor: colorScheme === 'dark' ? '#000000' : '#000000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: colorScheme === 'dark' ? 0.4 : 0.20,
      shadowRadius: 2.62,
      elevation: 4,
    },
    large: {
      shadowColor: colorScheme === 'dark' ? '#000000' : '#000000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: colorScheme === 'dark' ? 0.5 : 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    },
  },
  
  // Animation durations
  animation: {
    fast: 150,
    medium: 250,
    slow: 400,
  },
  
  // Common styles for consistency
  components: {
    card: {
      backgroundColor: colorScheme === 'dark' ? darkColors.surface : lightColors.surface,
      borderRadius: 12,
      padding: 16,
      shadowColor: colorScheme === 'dark' ? '#000000' : '#000000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: colorScheme === 'dark' ? 0.4 : 0.20,
      shadowRadius: 2.62,
      elevation: 4,
    },
    button: {
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    input: {
      backgroundColor: colorScheme === 'dark' ? darkColors.surface : lightColors.surface,
      borderColor: colorScheme === 'dark' ? darkColors.border : lightColors.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colorScheme === 'dark' ? darkColors.text : lightColors.text,
    },
  },
};

// Helper function to get colors for current theme
export const getColors = () => theme.colors;

// Theme type for proper TypeScript inference
export type Theme = typeof theme;

// Helper function to create theme-aware styles
export const createThemedStyles = <T>(styleFunc: (themeArg: Theme) => T): T => {
  return styleFunc(theme);
};