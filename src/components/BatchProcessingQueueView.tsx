import React, { useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  Flame,
  Globe,
  Layers,
  Maximize2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { AgentNode, BatchJob, BatchQueueConfig, BatchQueueState } from '../types/orchestrator';

interface BatchProcessingQueueViewProps {
  agents: AgentNode[];
  queueState: BatchQueueState;
  queueConfig: BatchQueueConfig;
  onDispatchBatch: (agentIds: string[], config?: Partial<BatchQueueConfig>) => void;
  onPauseQueue: () => void;
  onResumeQueue: () => void;
  onCancelQueue: () => void;
  onRetryFailed: () => void;
  isNlbMode: boolean;
}

export const BatchProcessingQueueView: React.FC<BatchProcessingQueueViewProps> = ({
  agents,
  queueState,
  queueConfig,
  onDispatchBatch,
  onPauseQueue,
  onResumeQueue,
  onCancelQueue,
  onRetryFailed,
  isNlbMode,
}) => {
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(agents.map((a) => a.id));
  const [concurrency, setConcurrency] = useState<number>(queueConfig.concurrency || 4);
  const [maxRetries, setMaxRetries] = useState<number>(queueConfig.maxRetries ?? 2);
  const [chaosRate, setChaosRate] = useState<number>(queueConfig.injectChaosRate || 0);
  const [repeatMultiplier, setRepeatMultiplier] = useState<number>(1);
  const [publicStakeholderMode, setPublicStakeholderMode] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'success' | 'retrying' | 'failed' | 'processing'>('all');

  const handleSelectAll = () => {
    setSelectedAgentIds(agents.map((a) => a.id));
  };

  const handleSelectByFamily = (family: 'crok' | 'qwen' | 'copilot') => {
    setSelectedAgentIds(agents.filter((a) => a.type === family).map((a) => a.id));
  };

  const handleToggleAgent = (id: string) => {
    setSelectedAgentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleStartDispatch = (opName?: string, customChaos?: number, customDecree?: string) => {
    if (selectedAgentIds.length === 0) return;

    let targetIds: string[] = [];
    for (let i = 0; i < repeatMultiplier; i++) {
      targetIds = targetIds.concat(selectedAgentIds);
    }

    onDispatchBatch(targetIds, {
      concurrency,
      maxRetries,
      injectChaosRate: customChaos !== undefined ? customChaos : chaosRate,
      operationName: opName || 'Custom Batch Dispatch',
      decreeHash: customDecree,
    });
  };

  // Strategic Preset Launches
  const handleLaunchPriorityDispatch = () => {
    setSelectedAgentIds(agents.map((a) => a.id));
    setConcurrency(6);
    setMaxRetries(3);
    setChaosRate(0);
    setRepeatMultiplier(3); // 18 jobs
    let targetIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      targetIds = targetIds.concat(agents.map((a) => a.id));
    }
    onDispatchBatch(targetIds, {
      concurrency: 6,
      maxRetries: 3,
      injectChaosRate: 0,
      operationName: 'Operation Priority Dispatch (Bael)',
    });
  };

  const handleLaunchChaosProbe = () => {
    setSelectedAgentIds(agents.map((a) => a.id));
    setConcurrency(4);
    setMaxRetries(3);
    setChaosRate(0.35); // 35% chaos
    setRepeatMultiplier(2); // 12 jobs
    let targetIds: string[] = [];
    for (let i = 0; i < 2; i++) {
      targetIds = targetIds.concat(agents.map((a) => a.id));
    }
    onDispatchBatch(targetIds, {
      concurrency: 4,
      maxRetries: 3,
      injectChaosRate: 0.35,
      operationName: 'Operation Chaos Probe (Loki)',
    });
  };

  const handleLaunchGenesisSeed = () => {
    setSelectedAgentIds(agents.map((a) => a.id));
    setConcurrency(3);
    setMaxRetries(2);
    setChaosRate(0);
    setRepeatMultiplier(1);
    onDispatchBatch(agents.map((a) => a.id), {
      concurrency: 3,
      maxRetries: 2,
      injectChaosRate: 0,
      operationName: 'Operation Genesis Seed (Enki)',
      decreeHash: 'WASM-DECREE-ENKI-0x7F9B-CHARITY-CARE-BINDING',
    });
  };

  const progressPercent =
    queueState.totalJobs > 0
      ? Math.round(((queueState.completedJobs + queueState.failedJobs) / queueState.totalJobs) * 100)
      : 0;

  const successPercent =
    queueState.totalJobs > 0
      ? Math.round((queueState.completedJobs / queueState.totalJobs) * 100)
      : 0;

  const filteredJobs = queueState.jobs.filter((j) => {
    if (activeFilter === 'success') return j.status === 'SUCCESS';
    if (activeFilter === 'retrying') return j.status === 'RETRYING';
    if (activeFilter === 'failed') return j.status === 'FAILED';
    if (activeFilter === 'processing') return j.status === 'PROCESSING';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Strategic Next Operations Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-sky-950/70 border border-sky-600/40 text-sky-400">
                <Sparkles className="w-3 h-3" />
                Strategic Swarm Operations
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {isNlbMode ? 'Target: AWS NLB Multi-AZ' : 'Target: Localhost:8888'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              Batch Handshake Queue & Antifragile Node Retry Engine
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Coordinate concurrent multi-agent handshakes with isolated per-node exponential backoff, circuit breaking, and decree ledger anchoring.
            </p>
          </div>

          {/* Public Stakeholder Transparency Mode Toggle */}
          <button
            id="btn-toggle-stakeholder-mode"
            onClick={() => setPublicStakeholderMode(!publicStakeholderMode)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              publicStakeholderMode
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 shadow-sm'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Public Stakeholder View: {publicStakeholderMode ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* 3 Strategic Operations Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
          {/* Operation Priority Dispatch (Bael) */}
          <div className="bg-slate-950/60 border border-slate-800 hover:border-sky-500/40 rounded-xl p-3.5 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  Priority Dispatch (Bael)
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  Stress Load
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2">
                Simulate high-throughput FAP intake via the AWS NLB across all 6 swarms at 6 concurrent workers.
              </p>
            </div>
            <button
              id="btn-launch-priority-dispatch"
              onClick={handleLaunchPriorityDispatch}
              disabled={queueState.status === 'RUNNING'}
              className="mt-3 w-full py-1.5 px-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Ignite Priority Dispatch</span>
            </button>
          </div>

          {/* Operation Chaos Probe (Loki) */}
          <div className="bg-slate-950/60 border border-slate-800 hover:border-amber-500/40 rounded-xl p-3.5 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
                  Chaos Probe (Loki)
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  Auto-Retry Test
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2">
                Inject 35% synthetic packet corruption & jitter to stress-test individual exponential retry recovery.
              </p>
            </div>
            <button
              id="btn-launch-chaos-probe"
              onClick={handleLaunchChaosProbe}
              disabled={queueState.status === 'RUNNING'}
              className="mt-3 w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Inject Chaos Probe</span>
            </button>
          </div>

          {/* Operation Genesis Seed (Enki) */}
          <div className="bg-slate-950/60 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-3.5 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Genesis Seed (Enki)
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  Decree Ledger
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2">
                Anchor immutable WASM Charity Care runtime decrees into the ledger with strict agent consensus.
              </p>
            </div>
            <button
              id="btn-launch-genesis-seed"
              onClick={handleLaunchGenesisSeed}
              disabled={queueState.status === 'RUNNING'}
              className="mt-3 w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Anchor Genesis Decree</span>
            </button>
          </div>
        </div>
      </div>

      {/* Public Stakeholder Transparency View (if toggled) */}
      {publicStakeholderMode && (
        <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">
                Public Stakeholder Liveness & Audit Ledger
              </h3>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-500/30">
              SLA Compliance: 99.98%
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            This read-only dashboard provides external advocacy groups and healthcare stakeholders cryptographic verification of real-time application processing, resilient retry bounds, and multi-AZ load balancing.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-900/50">
              <span className="text-[11px] text-slate-400 block">Sovereignty Status</span>
              <span className="text-sm font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Legally Anchored
              </span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-900/50">
              <span className="text-[11px] text-slate-400 block">Consensus Success</span>
              <span className="text-sm font-bold text-white mt-0.5 block">{successPercent}% Verified</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-900/50">
              <span className="text-[11px] text-slate-400 block">Current Throughput</span>
              <span className="text-sm font-bold text-sky-400 mt-0.5 block">{queueState.throughputRate} / sec</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-900/50">
              <span className="text-[11px] text-slate-400 block">WASM Decree Anchor</span>
              <span className="text-xs font-mono text-purple-400 mt-0.5 truncate block">0x7F9B...ENKI</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Queue Dashboard Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-6">
        {/* Top Controls: Dispatch Bar & Parameters */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pb-6 border-b border-slate-800">
          {/* Agent Selection Chips */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Target Nodes for Batch Handshake ({selectedAgentIds.length}/{agents.length})</span>
              </label>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  onClick={handleSelectAll}
                  className="text-sky-400 hover:text-sky-300 font-medium px-1.5 py-0.5 rounded hover:bg-slate-800"
                >
                  All
                </button>
                <span className="text-slate-600">•</span>
                <button
                  onClick={() => handleSelectByFamily('crok')}
                  className="text-slate-400 hover:text-slate-200 font-medium px-1.5 py-0.5 rounded hover:bg-slate-800"
                >
                  Crok
                </button>
                <span className="text-slate-600">•</span>
                <button
                  onClick={() => handleSelectByFamily('qwen')}
                  className="text-slate-400 hover:text-slate-200 font-medium px-1.5 py-0.5 rounded hover:bg-slate-800"
                >
                  Qwen
                </button>
                <span className="text-slate-600">•</span>
                <button
                  onClick={() => handleSelectByFamily('copilot')}
                  className="text-slate-400 hover:text-slate-200 font-medium px-1.5 py-0.5 rounded hover:bg-slate-800"
                >
                  Copilot
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {agents.map((agent) => {
                const isSelected = selectedAgentIds.includes(agent.id);
                return (
                  <button
                    key={agent.id}
                    onClick={() => handleToggleAgent(agent.id)}
                    className={`flex items-center justify-between p-2 rounded-xl text-left border text-xs transition-all ${
                      isSelected
                        ? 'bg-sky-950/60 border-sky-500/50 text-white shadow-xs'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="truncate">
                      <div className="font-semibold truncate">{agent.name}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">{agent.type}</div>
                    </div>
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[9px] ${
                        isSelected
                          ? 'bg-sky-500 border-sky-400 text-slate-950 font-bold'
                          : 'border-slate-700 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Config Sliders & Batch Execution Button */}
          <div className="lg:col-span-6 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {/* Concurrency Workers */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-300 font-medium mb-1">
                  <span>Concurrency</span>
                  <span className="font-mono text-sky-400 font-bold">{concurrency} workers</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={concurrency}
                  onChange={(e) => setConcurrency(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Parallel worker threads</span>
              </div>

              {/* Max Retries Per Node */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-300 font-medium mb-1">
                  <span>Max Retries</span>
                  <span className="font-mono text-amber-400 font-bold">{maxRetries} / node</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Exponential backoff</span>
              </div>

              {/* Chaos / Flakiness Injection */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-300 font-medium mb-1">
                  <span>Chaos Rate</span>
                  <span className="font-mono text-rose-400 font-bold">{Math.round(chaosRate * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.05"
                  value={chaosRate}
                  onChange={(e) => setChaosRate(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Synthetic network drops</span>
              </div>
            </div>

            {/* Queue Execution Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                id="btn-dispatch-custom-batch"
                onClick={() => handleStartDispatch()}
                disabled={queueState.status === 'RUNNING' || selectedAgentIds.length === 0}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {queueState.status === 'RUNNING' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                <span>
                  {queueState.status === 'RUNNING'
                    ? 'Processing Batch Handshakes...'
                    : `Schedule Batch (${selectedAgentIds.length * repeatMultiplier} Handshakes)`}
                </span>
              </button>

              {queueState.status === 'RUNNING' ? (
                <button
                  id="btn-pause-queue"
                  onClick={onPauseQueue}
                  className="py-2.5 px-3 bg-amber-950/70 hover:bg-amber-900/70 text-amber-300 border border-amber-800/60 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </button>
              ) : queueState.status === 'PAUSED' ? (
                <button
                  id="btn-resume-queue"
                  onClick={onResumeQueue}
                  className="py-2.5 px-3 bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-800/60 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Resume</span>
                </button>
              ) : null}

              {queueState.failedJobs > 0 && (
                <button
                  id="btn-retry-failed-jobs"
                  onClick={onRetryFailed}
                  className="py-2.5 px-3 bg-rose-950/70 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retry {queueState.failedJobs} Failed</span>
                </button>
              )}

              {queueState.status === 'RUNNING' && (
                <button
                  id="btn-cancel-queue"
                  onClick={onCancelQueue}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live Queue Progress Bar & High-Level Metrics */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-sky-400" />
                <span>{queueState.operationName}</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  queueState.status === 'RUNNING'
                    ? 'bg-sky-950 text-sky-400 border-sky-600/40 animate-pulse'
                    : queueState.status === 'COMPLETED'
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-600/40'
                    : queueState.status === 'PAUSED'
                    ? 'bg-amber-950 text-amber-400 border-amber-600/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {queueState.status}
              </span>
            </div>

            <div className="text-xs text-slate-400 font-mono flex items-center gap-3">
              <span>Throughput: <strong className="text-white">{queueState.throughputRate}</strong> req/s</span>
              <span>•</span>
              <span>Overall Progress: <strong className="text-white">{progressPercent}%</strong></span>
            </div>
          </div>

          {/* Progress Bar with Multiple Status Bands */}
          <div className="w-full bg-slate-950 rounded-full h-3 p-0.5 border border-slate-800 overflow-hidden flex">
            {/* Completed Success */}
            <div
              style={{
                width: `${queueState.totalJobs > 0 ? (queueState.completedJobs / queueState.totalJobs) * 100 : 0}%`,
              }}
              className="bg-emerald-500 h-full transition-all duration-300"
              title={`Success: ${queueState.completedJobs}`}
            />
            {/* Processing In-Flight */}
            <div
              style={{
                width: `${queueState.totalJobs > 0 ? (queueState.inFlightJobs / queueState.totalJobs) * 100 : 0}%`,
              }}
              className="bg-sky-500 h-full animate-pulse transition-all duration-300"
              title={`In Flight: ${queueState.inFlightJobs}`}
            />
            {/* Retrying with Backoff */}
            <div
              style={{
                width: `${queueState.totalJobs > 0 ? (queueState.retryingJobs / queueState.totalJobs) * 100 : 0}%`,
              }}
              className="bg-amber-500 h-full transition-all duration-300"
              title={`Retrying: ${queueState.retryingJobs}`}
            />
            {/* Permanently Failed */}
            <div
              style={{
                width: `${queueState.totalJobs > 0 ? (queueState.failedJobs / queueState.totalJobs) * 100 : 0}%`,
              }}
              className="bg-rose-500 h-full transition-all duration-300"
              title={`Failed: ${queueState.failedJobs}`}
            />
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block font-medium">Total Jobs</span>
              <span className="text-lg font-bold text-white font-mono mt-0.5 block">
                {queueState.totalJobs}
              </span>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-emerald-950/60">
              <span className="text-[11px] text-emerald-400 block font-medium">Successful</span>
              <span className="text-lg font-bold text-emerald-400 font-mono mt-0.5 block">
                {queueState.completedJobs}
              </span>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-sky-950/60">
              <span className="text-[11px] text-sky-400 block font-medium">In-Flight Workers</span>
              <span className="text-lg font-bold text-sky-400 font-mono mt-0.5 block">
                {queueState.inFlightJobs} / {queueState.concurrency}
              </span>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-amber-950/60">
              <span className="text-[11px] text-amber-400 block font-medium">Backoff Retrying</span>
              <span className="text-lg font-bold text-amber-400 font-mono mt-0.5 block">
                {queueState.retryingJobs}
              </span>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-rose-950/60">
              <span className="text-[11px] text-rose-400 block font-medium">Permanently Failed</span>
              <span className="text-lg font-bold text-rose-400 font-mono mt-0.5 block">
                {queueState.failedJobs}
              </span>
            </div>
          </div>
        </div>

        {/* Live Job Table & Filter Tabs */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Enqueued Agent Handshake Jobs ({filteredJobs.length})
            </h4>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded font-medium ${
                  activeFilter === 'all' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({queueState.jobs.length})
              </button>
              <button
                onClick={() => setActiveFilter('success')}
                className={`px-2.5 py-1 rounded font-medium ${
                  activeFilter === 'success' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Success ({queueState.completedJobs})
              </button>
              <button
                onClick={() => setActiveFilter('retrying')}
                className={`px-2.5 py-1 rounded font-medium ${
                  activeFilter === 'retrying' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Retrying ({queueState.retryingJobs})
              </button>
              <button
                onClick={() => setActiveFilter('failed')}
                className={`px-2.5 py-1 rounded font-medium ${
                  activeFilter === 'failed' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Failed ({queueState.failedJobs})
              </button>
            </div>
          </div>

          {/* Job Items List */}
          {queueState.jobs.length === 0 ? (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-8 text-center text-slate-400">
              <Layers className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-xs">No active batch queued. Choose an operation above or click "Schedule Batch".</p>
            </div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredJobs.map((job) => {
                return (
                  <div
                    key={job.id}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs transition-colors ${
                      job.status === 'SUCCESS'
                        ? 'bg-slate-950/80 border-emerald-950/70'
                        : job.status === 'PROCESSING'
                        ? 'bg-sky-950/30 border-sky-600/40 animate-pulse'
                        : job.status === 'RETRYING'
                        ? 'bg-amber-950/30 border-amber-600/40'
                        : job.status === 'FAILED'
                        ? 'bg-rose-950/30 border-rose-600/40'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    {/* Left: Agent Info & Status */}
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          job.status === 'SUCCESS'
                            ? 'bg-emerald-400'
                            : job.status === 'PROCESSING'
                            ? 'bg-sky-400 animate-ping'
                            : job.status === 'RETRYING'
                            ? 'bg-amber-400'
                            : job.status === 'FAILED'
                            ? 'bg-rose-400'
                            : 'bg-slate-600'
                        }`}
                      />
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{job.agentName}</span>
                          <span className="text-[10px] font-mono text-slate-400 uppercase bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            {job.agentType}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate max-w-[220px]">
                          {job.targetEndpoint}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Retry attempts & Latency */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
                      {/* Attempt Count Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full border ${
                          job.attempts > 1
                            ? 'bg-amber-950 text-amber-300 border-amber-600/40'
                            : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}
                      >
                        Attempt: {job.attempts}/{job.maxRetries + 1}
                      </span>

                      {/* Backoff / Delay if retrying */}
                      {job.status === 'RETRYING' && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <Clock className="w-3 h-3" />
                          <span>Backoff: {job.backoffDelayMs}ms</span>
                        </span>
                      )}

                      {/* Latency on Success */}
                      {job.status === 'SUCCESS' && (
                        <span className="text-emerald-400">
                          {job.latencyMs}ms latency
                        </span>
                      )}

                      {/* Error details if failed or retrying */}
                      {job.errorReason && (
                        <span className="text-rose-400 truncate max-w-[240px]" title={job.errorReason}>
                          {job.errorReason}
                        </span>
                      )}
                    </div>

                    {/* Right: Status Pill */}
                    <div>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          job.status === 'SUCCESS'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                            : job.status === 'PROCESSING'
                            ? 'bg-sky-950 text-sky-400 border-sky-500/40'
                            : job.status === 'RETRYING'
                            ? 'bg-amber-950 text-amber-400 border-amber-500/40'
                            : job.status === 'FAILED'
                            ? 'bg-rose-950 text-rose-400 border-rose-500/40'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        {job.status === 'SUCCESS' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : job.status === 'RETRYING' ? (
                          <RotateCcw className="w-3 h-3 animate-spin" />
                        ) : job.status === 'PROCESSING' ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : job.status === 'FAILED' ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>{job.status}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
