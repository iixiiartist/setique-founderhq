import { logger } from '../logger';

export type ExportSettings = {
  pageSize: 'a3' | 'a4' | 'a5' | 'letter' | 'legal';
  orientation: 'portrait' | 'landscape';
  margin: number;
  includePageNumbers: boolean;
  includeCoverPage: boolean;
  coverSubtitle: string;
  coverMeta: string;
  brandColor: string;
  footerNote: string;
};

export interface ExportPreset {
  id: string;
  name: string;
  description?: string;
  settings: ExportSettings;
  updatedAt: number;
  isDefault?: boolean;
}

interface WorkspaceExportRecord {
  lastUsed?: ExportSettings;
  presets?: ExportPreset[];
  defaultPresetId?: string | null;
  updatedAt?: number;
}

type ExportPreferencesStorage = Record<string, WorkspaceExportRecord>;

const STORAGE_KEY = 'founderhq:workspace-export-prefs';
const inMemoryStorage: ExportPreferencesStorage = {};

const readStorage = (): ExportPreferencesStorage => {
  if (typeof window === 'undefined') {
    return inMemoryStorage;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ExportPreferencesStorage;
  } catch (error) {
    console.warn('[documentExportPreferences] Failed to read storage', error);
    return {};
  }
};

const writeStorage = (data: ExportPreferencesStorage) => {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('[documentExportPreferences] Failed to write storage', error);
    }
  }

  Object.keys(inMemoryStorage).forEach((key) => delete inMemoryStorage[key]);
  Object.assign(inMemoryStorage, data);
};

const updateWorkspaceRecord = (
  workspaceId: string,
  updater: (current: WorkspaceExportRecord) => WorkspaceExportRecord,
): WorkspaceExportRecord => {
  if (!workspaceId) {
    throw new Error('workspaceId is required to persist export preferences');
  }

  const storage = readStorage();
  const currentRecord = storage[workspaceId] || {};
  const updatedRecord = updater(currentRecord);
  const nextStorage = { ...storage, [workspaceId]: updatedRecord };
  writeStorage(nextStorage);
  return updatedRecord;
};

export const createDefaultExportSettings = (workspaceName?: string): ExportSettings => ({
  pageSize: 'a4',
  orientation: 'portrait',
  margin: 54,
  includePageNumbers: true,
  includeCoverPage: true,
  coverSubtitle: workspaceName ? `${workspaceName} • GTM Workspace` : 'FounderHQ GTM Workspace',
  coverMeta: `Prepared ${new Date().toLocaleDateString()}`,
  brandColor: '#111827',
  footerNote: 'FounderHQ • setique.com',
});

export interface WorkspaceExportPreferences {
  settings: ExportSettings;
  presets: ExportPreset[];
  defaultPresetId: string | null;
}

export const loadWorkspaceExportPreferences = (
  workspaceId: string,
  workspaceName?: string,
): WorkspaceExportPreferences => {
  if (!workspaceId) {
    return {
      settings: createDefaultExportSettings(workspaceName),
      presets: [],
      defaultPresetId: null,
    };
  }

  const storage = readStorage();
  const record = storage[workspaceId];

  if (!record) {
    return {
      settings: createDefaultExportSettings(workspaceName),
      presets: [],
      defaultPresetId: null,
    };
  }

  const presets = (record.presets || []).map((preset) => ({
    ...preset,
    isDefault: record.defaultPresetId === preset.id,
  }));

  const defaultPreset = presets.find((preset) => preset.id === record.defaultPresetId);
  const settings = defaultPreset?.settings
    || record.lastUsed
    || createDefaultExportSettings(workspaceName);

  return {
    settings,
    presets,
    defaultPresetId: record.defaultPresetId ?? null,
  };
};

export const saveWorkspaceExportSettings = (workspaceId: string, settings: ExportSettings) => {
  try {
    updateWorkspaceRecord(workspaceId, (current) => ({
      ...current,
      lastUsed: settings,
      updatedAt: Date.now(),
    }));
  } catch (error) {
    logger.warn('[documentExportPreferences] Failed to save workspace export settings', error);
  }
};

export const saveWorkspaceExportPresets = (
  workspaceId: string,
  presets: ExportPreset[],
  defaultPresetId: string | null,
) => {
  try {
    updateWorkspaceRecord(workspaceId, (current) => ({
      ...current,
      presets,
      defaultPresetId,
      updatedAt: Date.now(),
    }));
  } catch (error) {
    logger.warn('[documentExportPreferences] Failed to save workspace export presets', error);
  }
};
