export interface ColorPalette {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  income: string;
  incomeLight: string;
  expense: string;
  expenseLight: string;
  transfer: string;
  transferLight: string;

  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceHover: string;
  surfaceActive: string;

  border: string;
  borderLight: string;

  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  warning: string;
  warningLight: string;
  danger: string;
  success: string;
  info: string;

  overlay: string;
  cardHighlight: string;
}

export const darkPalette: ColorPalette = {
  primary: '#10B981', // Emerald 500
  primaryLight: '#34D399',
  primaryDark: '#059669',

  income: '#10B981',
  incomeLight: 'rgba(16, 185, 129, 0.15)',
  expense: '#F43F5E', // Rose 500
  expenseLight: 'rgba(244, 63, 94, 0.15)',
  transfer: '#3B82F6', // Blue 500
  transferLight: 'rgba(59, 130, 246, 0.15)',

  background: '#090D16', // Deep Obsidian
  backgroundSecondary: '#0F172A',
  surface: '#131D33', // Slightly elevated card
  surfaceHover: '#1B2744',
  surfaceActive: '#223258',

  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.04)',

  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#090D16',

  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.15)',
  danger: '#EF4444',
  success: '#10B981',
  info: '#0EA5E9',

  overlay: 'rgba(5, 8, 15, 0.85)',
  cardHighlight: 'rgba(16, 185, 129, 0.08)',
};

export const lightPalette: ColorPalette = {
  primary: '#059669',
  primaryLight: '#10B981',
  primaryDark: '#047857',

  income: '#059669',
  incomeLight: 'rgba(5, 150, 105, 0.12)',
  expense: '#E11D48',
  expenseLight: 'rgba(225, 29, 72, 0.12)',
  transfer: '#2563EB',
  transferLight: 'rgba(37, 99, 235, 0.12)',

  background: '#F8FAFC',
  backgroundSecondary: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceHover: '#F8FAFC',
  surfaceActive: '#F1F5F9',

  border: 'rgba(0, 0, 0, 0.08)',
  borderLight: 'rgba(0, 0, 0, 0.04)',

  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#F8FAFC',

  warning: '#D97706',
  warningLight: 'rgba(217, 119, 6, 0.12)',
  danger: '#DC2626',
  success: '#059669',
  info: '#0284C7',

  overlay: 'rgba(15, 23, 42, 0.6)',
  cardHighlight: 'rgba(5, 150, 105, 0.06)',
};

