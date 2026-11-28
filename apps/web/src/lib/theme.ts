import { useCallback, useEffect, useState } from 'react';

export const THEME_CHOICES = ['light', 'dark', 'system'] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];

// index.html repeats this rule so the first paint is already right.
const STORAGE_KEY = 'theme';
const THEME_COLOURS = { light: '#f1f5f3', dark: '#0e1118' };

export function savedTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return THEME_CHOICES.find((choice) => choice === value) ?? 'system';
  } catch {
    return 'system';
  }
}

export function isDark(choice: ThemeChoice, deviceIsDark: boolean): boolean {
  return choice === 'dark' || (choice === 'system' && deviceIsDark);
}

const deviceQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

function apply(choice: ThemeChoice): void {
  const dark = isDark(choice, deviceQuery().matches);
  document.documentElement.classList.toggle('dark', dark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLOURS[dark ? 'dark' : 'light']);
}

/** This device's light/dark choice. "System" follows the phone's own setting. */
export function useTheme(): [ThemeChoice, (choice: ThemeChoice) => void] {
  const [choice, setChoice] = useState(savedTheme);

  useEffect(() => {
    apply(choice);
    if (choice !== 'system') return;
    const query = deviceQuery();
    const follow = () => {
      apply('system');
    };
    query.addEventListener('change', follow);
    return () => {
      query.removeEventListener('change', follow);
    };
  }, [choice]);

  const change = useCallback((next: ThemeChoice) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private windows may refuse storage; the choice then lasts until the page closes.
    }
    setChoice(next);
  }, []);

  return [choice, change];
}
