import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Cloud,
  Database,
  Lock,
  Save,
  Shield,
  Sliders,
  X,
  Zap,
} from 'lucide-react';
import { UserConfig } from '../types/orchestrator';

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: UserConfig;
  onSave: (newConfig: Partial<UserConfig>) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [formConfig, setFormConfig] = useState<UserConfig>({ ...config });
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formConfig);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-950/60 border border-sky-800/60 rounded-xl text-sky-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Orchestrator Lattice & Security Preferences
              </h2>
              <p className="text-xs text-slate-400">
                Personalized data sync intervals, cryptographic ciphers, MFA, and cloud archival.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {savedSuccess && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Settings successfully saved and synchronized across the sovereign daemon.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Data Sync Intervals & Heartbeat */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Personalized Data Sync Intervals</span>
            </h3>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Socket Sync & Heartbeat Interval</span>
                <span className="font-mono text-sky-400 font-bold">
                  {formConfig.syncIntervalMs} ms ({ (formConfig.syncIntervalMs / 1000).toFixed(1) }s)
                </span>
              </div>
              <input
                type="range"
                min="500"
                max="10000"
                step="250"
                value={formConfig.syncIntervalMs}
                onChange={(e) =>
                  setFormConfig({ ...formConfig, syncIntervalMs: Number(e.target.value) })
                }
                className="w-full accent-sky-500 bg-slate-800 cursor-pointer h-1.5 rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>500ms (High-Frequency)</span>
                <span>2,500ms (Balanced)</span>
                <span>10,000ms (Power-Saving)</span>
              </div>
            </div>
          </div>

          {/* Section 2: Cryptographic Protocols & Security */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Cryptographic Protocols & Data at Rest</span>
            </h3>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Lattice Encryption Protocol
                </label>
                <select
                  value={formConfig.encryptionProtocol}
                  onChange={(e) =>
                    setFormConfig({
                      ...formConfig,
                      encryptionProtocol: e.target.value as any,
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-medium"
                >
                  <option value="SHA3-512-Signed">
                    SHA3-512 Signed (Standard Sovereign Consensus)
                  </option>
                  <option value="AES-256-GCM">
                    AES-256-GCM (Hardware HSM Acceleration)
                  </option>
                  <option value="ChaCha20-Poly1305">
                    ChaCha20-Poly1305 (Ultra-low Latency Stream Cipher)
                  </option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enforces end-to-end cryptographic verification across all agent handshake packets.
                </p>
              </div>

              {/* MFA Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                <div>
                  <span className="text-xs font-medium text-slate-200 block">
                    Multi-Factor Authentication (MFA)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Require TOTP/WebAuthn hardware key for administrative router controls.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formConfig.mfaEnabled}
                    onChange={(e) =>
                      setFormConfig({ ...formConfig, mfaEnabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Strict Schema Enforcement Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                <div>
                  <span className="text-xs font-medium text-slate-200 block">
                    Strict Message Schema Validation
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Reject packets instantly if required fields (sender_id, message_id) are missing.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formConfig.strictSchemaValidation}
                    onChange={(e) =>
                      setFormConfig({
                        ...formConfig,
                        strictSchemaValidation: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Cloud Storage & Audit Logs */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Cloud className="w-4 h-4 text-indigo-400" />
              <span>Automated Cloud Storage Log Archival</span>
            </h3>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-200 block">
                    Automatic Session Export
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Automatically pipe telemetry and handshake metrics to cloud storage after each session.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formConfig.autoExportLogs}
                    onChange={(e) =>
                      setFormConfig({ ...formConfig, autoExportLogs: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-900">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    S3 Bucket Target
                  </label>
                  <input
                    type="text"
                    value={formConfig.cloudStorageBucket}
                    onChange={(e) =>
                      setFormConfig({ ...formConfig, cloudStorageBucket: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Cloud Region
                  </label>
                  <input
                    type="text"
                    value={formConfig.cloudStorageRegion}
                    onChange={(e) =>
                      setFormConfig({ ...formConfig, cloudStorageRegion: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
