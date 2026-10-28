export const colors = {
primary: '#8C7E6C',
primaryPressed: '#766958',
primaryContainer: '#F2E0CB',
onPrimary: '#FFFFFF',

secondary: '#5D685A',
secondaryContainer: '#DAE6D4',
onSecondary: '#FFFFFF',

tertiary: '#C9B6A0',

background: '#FBF9F5',
surface: '#FFFFFF',
surfaceMuted: '#F3EFEA',
surfaceBorder: '#E8E2D9',

text: '#2B2824',
textSecondary: '#5D574F',
textMuted: '#81786D',

error: '#BA1A1A',
errorContainer: '#FFDAD6',

disabled: '#E8E1DB',
onDisabled: '#81786D',

white: '#FFFFFF',
transparent: 'transparent',
} as const;

export type AppColors = typeof colors;