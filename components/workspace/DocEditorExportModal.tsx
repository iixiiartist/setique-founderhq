import React from 'react';
import { X } from 'lucide-react';
import {
  ExportSettings,
  ExportPreset,
} from '../../lib/services/documentExportPreferences';

export interface DocEditorExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  exportSettings: ExportSettings;
  exportPresets: ExportPreset[];
  selectedPresetId: string | null;
  defaultPresetId: string | null;
  workspaceDefaultPreset: ExportPreset | null;
  newPresetName: string;
  presetFormError: string | null;
  onExportSettingChange: <K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) => void;
  onApplyPreset: (presetId: string) => void;
  onCreatePreset: (e: React.FormEvent<HTMLFormElement>) => void;
  onUpdateSelectedPreset: () => void;
  onDeleteSelectedPreset: () => void;
  onSetDefaultPreset: (presetId: string) => void;
  onResetSettings: () => void;
  onSavePreferences: () => void;
  onNewPresetNameChange: (name: string) => void;
  onExport: (format: 'pdf' | 'html' | 'markdown' | 'text') => void;
}

const PAGE_SIZE_OPTIONS: { value: ExportSettings['pageSize']; label: string }[] = [
  { value: 'letter', label: 'Letter (8.5" × 11")' },
  { value: 'a4', label: 'A4 (210 × 297 mm)' },
  { value: 'legal', label: 'Legal (8.5" × 14")' },
];

const ORIENTATION_OPTIONS: { value: ExportSettings['orientation']; label: string }[] = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
];

export function DocEditorExportModal({
  isOpen,
  onClose,
  title,
  exportSettings,
  exportPresets,
  selectedPresetId,
  defaultPresetId,
  workspaceDefaultPreset,
  newPresetName,
  presetFormError,
  onExportSettingChange,
  onApplyPreset,
  onCreatePreset,
  onUpdateSelectedPreset,
  onDeleteSelectedPreset,
  onSetDefaultPreset,
  onResetSettings,
  onSavePreferences,
  onNewPresetNameChange,
  onExport,
}: DocEditorExportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-gray-400 font-semibold">Export</p>
            <h3 className="text-2xl font-bold mt-2">Professional PDF settings</h3>
            <p className="text-sm text-gray-600 mt-1">
              Pick the layout, cover, and branding that matches your investor updates and board-ready docs.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-500"
            aria-label="Close export settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Presets Section */}
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-gray-400 font-semibold">Workspace presets</p>
              <p className="text-sm text-gray-600">Save investor-ready layouts and reuse them across docs.</p>
            </div>
            {workspaceDefaultPreset && (
              <span className="text-xs font-semibold text-gray-600">Default: {workspaceDefaultPreset.name}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {exportPresets.length === 0 ? (
              <span className="text-xs text-gray-500">No presets yet—dial in your layout then save it below.</span>
            ) : (
              exportPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onApplyPreset(preset.id)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    selectedPresetId === preset.id
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {preset.name}
                  {preset.id === defaultPresetId && <span className="text-amber-400">★</span>}
                </button>
              ))
            )}
          </div>
          <form onSubmit={onCreatePreset} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => onNewPresetNameChange(e.target.value)}
              className="flex-1 rounded-xl border border-dashed border-gray-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none"
              placeholder="Preset name (e.g. Board Update)"
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md hover:bg-slate-800 transition-all disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!newPresetName.trim()}
            >
              Save preset
            </button>
          </form>
          {presetFormError && <p className="text-xs text-red-500">{presetFormError}</p>}
          {selectedPresetId && exportPresets.some((preset) => preset.id === selectedPresetId) && (
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={onUpdateSelectedPreset}
                className="rounded-full border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 hover:border-gray-500"
              >
                Update selected preset
              </button>
              <button
                type="button"
                onClick={() => onSetDefaultPreset(selectedPresetId)}
                disabled={selectedPresetId === defaultPresetId}
                className="rounded-full border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mark as workspace default
              </button>
              <button
                type="button"
                onClick={onDeleteSelectedPreset}
                className="rounded-full border border-red-200 px-3 py-1.5 font-semibold text-red-600 hover:bg-red-50"
              >
                Delete preset
              </button>
            </div>
          )}
        </div>

        {/* Settings Grid */}
        <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-6">
          {/* Left Column - Settings */}
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                Page size
                <select
                  className="mt-1 rounded-xl border-gray-200 shadow-sm focus:border-black focus:ring-black px-3 py-2 text-sm"
                  value={exportSettings.pageSize}
                  onChange={(e) => onExportSettingChange('pageSize', e.target.value as ExportSettings['pageSize'])}
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                Orientation
                <select
                  className="mt-1 rounded-xl border-gray-200 shadow-sm focus:border-black focus:ring-black px-3 py-2 text-sm"
                  value={exportSettings.orientation}
                  onChange={(e) => onExportSettingChange('orientation', e.target.value as ExportSettings['orientation'])}
                >
                  {ORIENTATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                Margins (pts)
                <input
                  type="number"
                  min={36}
                  max={96}
                  step={2}
                  value={exportSettings.margin}
                  onChange={(e) => onExportSettingChange('margin', Math.min(120, Math.max(24, Number(e.target.value) || 0)))}
                  className="mt-1 rounded-xl border-gray-200 shadow-sm focus:border-black focus:ring-black px-3 py-2 text-sm"
                />
                <span className="text-xs text-gray-500">Higher values leave more white space for headers/footers.</span>
              </label>
              <div className="text-sm font-semibold text-gray-700 flex flex-col gap-2">
                Options
                <label className="inline-flex items-center gap-2 text-sm font-normal text-gray-700">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-black focus:ring-black"
                    checked={exportSettings.includeCoverPage}
                    onChange={(e) => onExportSettingChange('includeCoverPage', e.target.checked)}
                  />
                  Include cover page
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-normal text-gray-700">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-black focus:ring-black"
                    checked={exportSettings.includePageNumbers}
                    onChange={(e) => onExportSettingChange('includePageNumbers', e.target.checked)}
                  />
                  Include page numbers
                </label>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                Cover subtitle
                <input
                  type="text"
                  value={exportSettings.coverSubtitle}
                  onChange={(e) => onExportSettingChange('coverSubtitle', e.target.value)}
                  className="mt-1 rounded-xl border-gray-200 shadow-sm focus:border-black focus:ring-black px-3 py-2 text-sm"
                  placeholder="Investor update • Q4"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                Cover meta
                <input
                  type="text"
                  value={exportSettings.coverMeta}
                  onChange={(e) => onExportSettingChange('coverMeta', e.target.value)}
                  className="mt-1 rounded-xl border-gray-200 shadow-sm focus:border-black focus:ring-black px-3 py-2 text-sm"
                  placeholder="Prepared for Board & Strategic Advisors"
                />
              </label>
            </div>

            <div className="grid sm:grid-cols-[auto_1fr] gap-4 items-center">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-3">
                Brand color
                <input
                  type="color"
                  value={exportSettings.brandColor}
                  onChange={(e) => onExportSettingChange('brandColor', e.target.value)}
                  className="h-10 w-16 rounded-xl border border-gray-200 cursor-pointer"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                Footer note
                <input
                  type="text"
                  value={exportSettings.footerNote}
                  onChange={(e) => onExportSettingChange('footerNote', e.target.value)}
                  className="mt-1 rounded-xl border-gray-200 shadow-sm focus:border-black focus:ring-black px-3 py-2 text-sm"
                  placeholder="Setique: FounderHQ • setique.com"
                />
              </label>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-4 flex flex-col gap-4">
            <div className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-400">Preview</div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-inner p-5 space-y-3">
              <div
                className="h-2 w-16 rounded-full"
                style={{ backgroundColor: exportSettings.brandColor }}
              ></div>
              <h4 className="text-lg font-semibold text-gray-900">{title || 'Untitled document'}</h4>
              <p className="text-sm text-gray-600">{exportSettings.coverSubtitle}</p>
              <p className="text-xs text-gray-500">{exportSettings.coverMeta}</p>
              <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-gray-500">
                <span className="px-2 py-0.5 border border-gray-200 rounded-full">{exportSettings.pageSize.toUpperCase()}</span>
                <span className="px-2 py-0.5 border border-gray-200 rounded-full">{exportSettings.orientation}</span>
                {exportSettings.includeCoverPage && (
                  <span className="px-2 py-0.5 border border-gray-200 rounded-full">Cover</span>
                )}
                {exportSettings.includePageNumbers && (
                  <span className="px-2 py-0.5 border border-gray-200 rounded-full">Page #</span>
                )}
              </div>
              <div className="text-xs text-gray-400 border-t border-dashed border-gray-200 pt-3">
                {exportSettings.footerNote}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Settings apply to PDF exports. Markdown/HTML/Text use their own balanced formatting.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={onResetSettings}
            className="text-sm font-semibold text-gray-600 hover:text-black"
          >
            Reset to defaults
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onSavePreferences}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold shadow-sm hover:shadow-md hover:bg-slate-800 transition-all"
            >
              Save settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocEditorExportModal;
