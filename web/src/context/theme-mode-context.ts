import { createContext } from 'react';
import type { ThemeMode } from '../styles/createAppTheme';

export const ThemeModeContext = createContext<{
  mode: ThemeMode;
  toggle: () => void;
} | null>(null);
