import React from 'react';
import {
  Activity,
  Cpu,
  Power,
  RotateCcw,
  Settings,
  Code2,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Cloud,
  Layers,
  Zap,
  Play,
  Pause,
  RefreshCw,
} from 'lucide-react';
import { AutomationEngineState, DaemonState } from '../types/orchestrator';

interface HeaderProps {
  state: DaemonState;
  automation: AutomationEngineState;
  onTogglePower: () => void;
  onToggleAutomation: () => void;
  onSetCadence: (cadenceMs: number, mode: 'BALANCED' | 'AGGRESSIVE' | 'CONSERVATIVE') => void;
  onImmediateSweep: () => void;
  onOpenConfig: () => void;
  activeTab: 'orchestrator' | 'batch' | 'aws' | 'tests' | 'code';
  onChangeTab: (tab: 'orchestrator' | 'batch' | 'aws' | 'tests' | 'code') => void;
  onQuickHandshake: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  automation,
  onTogglePower,
  onToggleAutomation,
  onSetCadence,
  onImmediateSweep,
  onOpenConfig,
  activeTab,
  onChangeTab,
  onQuickHandshake,
}) => {
  const isOnline = state.status === 'ACTIVE';

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo & Subsystem Info */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 via-sky-500/10 to-emerald-500/20 border border-slate-700/60 shadow-inner">
              <Cpu className="w-6 h-6 text-sky-400 animate-pulse" />
              {isOnline && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-950"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  Sovereign Swarm Orchestrator
                </h1>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${
                    isOnline
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-950/60 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {isOnline ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {state.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Central Router Daemon</span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-sky-400/90">tcp://{state.host}:{state.port}</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400/90 font-medium">660 Threads Synchronized</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              id="tab-btn-orchestrator"
              onClick={() => onChangeTab('orchestrator')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'orchestrator'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Orchestrator Mesh</span>
            </button>

            <button
              id="tab-btn-batch"
              onClick={() => onChangeTab('batch')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'batch'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Batch Queue</span>
            </button>

            <button
              id="tab-btn-aws"
              onClick={() => onChangeTab('aws')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'aws'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>AWS Multi-AZ Infra</span>
            </button>

            <button
              id="tab-btn-tests"
              onClick={() => onChangeTab('tests')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'tests'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Unit Tests</span>
            </button>

            <button
              id="tab-btn-code"
              onClick={() => onChangeTab('code')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'code'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Source Artifacts</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              id="btn-quick-handshake"
              onClick={onQuickHandshake}
              title="Trigger Immediate Handshake Protocol"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-200 bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800/60 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
              <span>Initiate Handshake</span>
            </button>

            <button
              id="btn-config-settings"
              onClick={onOpenConfig}
              title="Open Personalized Configuration"
              className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              id="btn-toggle-daemon"
              onClick={onTogglePower}
              title={isOnline ? 'Shut down Daemon' : 'Ignite Daemon Kernel'}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                isOnline
                  ? 'bg-slate-900 text-rose-300 border-rose-900/50 hover:bg-rose-950/40'
                  : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{isOnline ? 'Stop Daemon' : 'Ignite Daemon'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Autonomous Orchestration Master Bar */}
      <div className="bg-slate-950/90 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                {automation.enabled && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    automation.enabled ? 'bg-cyan-500' : 'bg-slate-500'
                  }`}
                ></span>
              </span>
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Autonomous Engine:</span>
                <span className={automation.enabled ? 'text-cyan-400 font-mono' : 'text-slate-400 font-mono'}>
                  {automation.enabled ? 'AUTOMATING ALL PROCESSES' : 'PAUSED'}
                </span>
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-3 text-slate-400 font-mono text-[11px]">
              <span>
                Cycles: <strong className="text-white">{automation.cyclesCompleted}</strong>
              </span>
              <span>•</span>
              <span>
                Auto-Packets: <strong className="text-emerald-400">{automation.packetsAutoRouted}</strong>
              </span>
              <span>•</span>
              <span>
                Self-Healed: <strong className="text-amber-400">{automation.selfHealsResolved}</strong>
              </span>
              <span>•</span>
              <span>
                Loop: <strong className="text-sky-300">{automation.cadenceMs}ms</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Cadence Presets */}
            <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-[11px]">
              <button
                onClick={() => onSetCadence(1000, 'AGGRESSIVE')}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  automation.mode === 'AGGRESSIVE'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Fast: 1000ms loop"
              >
                Fast (1s)
              </button>
              <button
                onClick={() => onSetCadence(2500, 'BALANCED')}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  automation.mode === 'BALANCED'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Balanced: 2500ms loop"
              >
                Normal (2.5s)
              </button>
              <button
                onClick={() => onSetCadence(5000, 'CONSERVATIVE')}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  automation.mode === 'CONSERVATIVE'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Calm: 5000ms loop"
              >
                Calm (5s)
              </button>
            </div>

            <button
              id="btn-force-autonomous-sweep"
              onClick={onImmediateSweep}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-colors"
              title="Force immediate automated sweep"
            >
              <RefreshCw className="w-3 h-3 text-slate-400" />
              <span>Sweep Now</span>
            </button>

            <button
              id="btn-toggle-automation"
              onClick={onToggleAutomation}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                automation.enabled
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800 hover:bg-cyan-900/60'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 hover:from-emerald-500 hover:to-teal-500 shadow-sm'
              }`}
            >
              {automation.enabled ? (
                <>
                  <Pause className="w-3 h-3 text-cyan-400" />
                  <span>Pause Automation</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>Automate All Processes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

