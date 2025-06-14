import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppSettings {
  autoTranscribeRecordings: boolean;
  preferredTranscriptionLanguage: string;
  transcriptionQuality: 'fast' | 'balanced' | 'high';
}

const DEFAULT_SETTINGS: AppSettings = {
  autoTranscribeRecordings: false,
  preferredTranscriptionLanguage: 'en',
  transcriptionQuality: 'balanced',
};

const SETTINGS_KEY = '@ProductivityApp:settings';

export class SettingsService {
  private cachedSettings: AppSettings | null = null;

  async getSettings(): Promise<AppSettings> {
    if (this.cachedSettings) {
      return this.cachedSettings;
    }

    try {
      const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        this.cachedSettings = { ...DEFAULT_SETTINGS, ...settings };
      } else {
        this.cachedSettings = DEFAULT_SETTINGS;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.cachedSettings = DEFAULT_SETTINGS;
    }

    return this.cachedSettings!;
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<void> {
    const currentSettings = await this.getSettings();
    const newSettings = { ...currentSettings, ...updates };
    
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      this.cachedSettings = newSettings;
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  async getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    const settings = await this.getSettings();
    return settings[key];
  }

  async setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    await this.updateSettings({ [key]: value } as Partial<AppSettings>);
  }

  async resetSettings(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SETTINGS_KEY);
      this.cachedSettings = null;
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  }
}

export const settingsService = new SettingsService();