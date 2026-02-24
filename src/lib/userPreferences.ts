import { useState, useEffect } from 'react';
import type { Chain } from './types';

export type UserMode = 'simple' | 'pro';
export type RiskProfile = 'conservative' | 'standard' | 'aggressive';
export type ThemeMode = 'light' | 'dark';

export interface UserPreferences {
  mode: UserMode;
  riskProfile: RiskProfile;
  chains: Chain[];
  alertTypes: ('price' | 'volume' | 'signal' | 'risk')[];
  onboardingComplete: boolean;
  theme: ThemeMode;
}

const DEFAULT_PREFS: UserPreferences = {
  mode: 'simple',
  riskProfile: 'standard',
  chains: ['ethereum', 'bsc', 'arbitrum', 'polygon', 'base'],
  alertTypes: ['signal', 'risk'],
  onboardingComplete: false,
  theme: 'light',
};

function loadPrefs(): UserPreferences {
  try {
    const stored = localStorage.getItem('omnidex_prefs');
    if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_PREFS;
}

function savePrefs(prefs: UserPreferences) {
  localStorage.setItem('omnidex_prefs', JSON.stringify(prefs));
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  // Update meta theme-color
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#0a0e14' : '#f5f6f8');
  }
}

export function useUserPreferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(() => {
    const p = loadPrefs();
    applyTheme(p.theme);
    return p;
  });

  useEffect(() => {
    savePrefs(prefs);
    applyTheme(prefs.theme);
  }, [prefs]);

  const updatePrefs = (partial: Partial<UserPreferences>) => {
    setPrefs(prev => ({ ...prev, ...partial }));
  };

  return { prefs, updatePrefs };
}
