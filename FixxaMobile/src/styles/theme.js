// Theme colors and styles for Fixxa mobile app
export const COLORS = {
  // Primary colors
  primary: 'forestgreen',
  primaryDark: '#2d5016',
  primaryLight: '#4a7c59',

  // Status colors
  success: '#28a745',
  error: '#dc3545',
  warning: '#ffc107',
  info: '#17a2b8',

  // Neutral colors
  white: '#ffffff',
  black: '#000000',
  gray: '#666666',
  lightGray: '#e0e0e0',
  veryLightGray: '#f5f6fa',

  // Text colors
  textPrimary: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',

  // Background colors
  background: '#f5f6fa',
  cardBackground: '#ffffff',
  inputBackground: '#f9f9f9',
};

export const FONTS = {
  regular: {
    fontFamily: 'System',
    fontWeight: '400',
  },
  medium: {
    fontFamily: 'System',
    fontWeight: '500',
  },
  semiBold: {
    fontFamily: 'System',
    fontWeight: '600',
  },
  bold: {
    fontFamily: 'System',
    fontWeight: '700',
  },
};

export const SIZES = {
  // Font sizes
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,

  // Spacing
  padding: 16,
  margin: 16,
  borderRadius: 12,

  // Component sizes
  buttonHeight: 48,
  inputHeight: 48,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};
