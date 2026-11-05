import { createContext } from 'react';
import { AppearanceMode } from '../types';

export interface ThemeContextType {
  mode: AppearanceMode;
  resolvedTheme: 'light' | 'dark';
  setMode: (mode: AppearanceMode) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
