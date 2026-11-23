import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { ColorPalette, darkPalette, lightPalette } from './colors';
import { typography } from './typography';
import { spacing, borderRadius } from './spacing';

export type ThemeMode = 'system' | 'dark' | 'light';

export interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  colors: ColorPalette;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('dark'); // Default to dark premium aesthetic

  const isDark = mode === 'system' ? systemColorScheme === 'dark' : mode === 'dark';
  const colors = isDark ? darkPalette : lightPalette;

  const value: ThemeContextValue = {
    mode,
    isDark,
    colors,
    typography,
    spacing,
    borderRadius,
    setMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

