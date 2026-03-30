import { useState, useEffect, useCallback } from 'react';

// Keys
const KEYS = {
  dateFormat: 'lfpro-date-format',
  weekStart: 'lfpro-week-start',
  numberFormat: 'lfpro-number-format',
  sidebarPosition: 'lfpro-sidebar-position',
  sidebarAutoCollapse: 'lfpro-sidebar-collapse',
  animationsEnabled: 'lfpro-animations',
  themeMode: 'lfpro-theme-mode',
  themeColor: 'lfpro-theme-color',
  themeDensity: 'lfpro-theme-density',
  notifications: 'lfpro-notification-settings',
} as const;

export interface UserPreferences {
  dateFormat: string;
  weekStart: string;
  numberFormat: string;
  sidebarPosition: 'left' | 'right';
  sidebarAutoCollapse: boolean;
  animationsEnabled: boolean;
  themeMode: 'auto' | 'light' | 'dark';
  themeColor: string;
  themeDensity: 'compact' | 'normal' | 'spacious';
}

const DEFAULTS: UserPreferences = {
  dateFormat: 'dd/MM/yyyy',
  weekStart: 'monday',
  numberFormat: 'pt-BR',
  sidebarPosition: 'left',
  sidebarAutoCollapse: false,
  animationsEnabled: true,
  themeMode: 'auto',
  themeColor: '211 100% 46%',
  themeDensity: 'normal',
};

function loadPreferences(): UserPreferences {
  return {
    dateFormat: localStorage.getItem(KEYS.dateFormat) || DEFAULTS.dateFormat,
    weekStart: localStorage.getItem(KEYS.weekStart) || DEFAULTS.weekStart,
    numberFormat: localStorage.getItem(KEYS.numberFormat) || DEFAULTS.numberFormat,
    sidebarPosition: (localStorage.getItem(KEYS.sidebarPosition) as 'left' | 'right') || DEFAULTS.sidebarPosition,
    sidebarAutoCollapse: localStorage.getItem(KEYS.sidebarAutoCollapse) === 'true',
    animationsEnabled: localStorage.getItem(KEYS.animationsEnabled) !== 'false',
    themeMode: (localStorage.getItem(KEYS.themeMode) as 'auto' | 'light' | 'dark') || DEFAULTS.themeMode,
    themeColor: localStorage.getItem(KEYS.themeColor) || DEFAULTS.themeColor,
    themeDensity: (localStorage.getItem(KEYS.themeDensity) as 'compact' | 'normal' | 'spacious') || DEFAULTS.themeDensity,
  };
}

export function useUserPreferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(loadPreferences);

  const updatePreference = useCallback(<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    const storageKey = KEYS[key];
    localStorage.setItem(storageKey, String(value));
    setPrefs(prev => ({ ...prev, [key]: value }));
  }, []);

  return { preferences: prefs, updatePreference };
}

export interface NotificationSettings {
  email_enabled: boolean;
  daily_digest: boolean;
  mentions: boolean;
  task_assigned: boolean;
  status_changed: boolean;
  due_dates: boolean;
  new_members: boolean;
  desktop_enabled: boolean;
  sound_enabled: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  email_enabled: true,
  daily_digest: false,
  mentions: true,
  task_assigned: true,
  status_changed: true,
  due_dates: true,
  new_members: false,
  desktop_enabled: true,
  sound_enabled: true,
};

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem(KEYS.notifications);
    if (saved) {
      try { return { ...DEFAULT_NOTIFICATIONS, ...JSON.parse(saved) }; }
      catch { return DEFAULT_NOTIFICATIONS; }
    }
    return DEFAULT_NOTIFICATIONS;
  });

  const updateSetting = useCallback(<K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(KEYS.notifications, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, updateSetting };
}
