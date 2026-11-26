import { useContext } from 'react';
import { ThemeModeContext } from './theme-mode-context';

export function useThemeMode() {
  const value = useContext(ThemeModeContext);
  if (!value) {
    throw new Error('useThemeMode must be used inside ThemeProvider');
  }
  return value;
}
