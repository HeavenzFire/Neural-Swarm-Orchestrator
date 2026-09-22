import React, { useState } from 'react';
import {
  Activity,
  CheckCircle,
  Copy,
  Cpu,
  Layers,
  Network,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { AgentNode, DaemonState } from '../types/orchestrator';

interface OrchestratorOverviewProps {
  daemonState: DaemonState;
  agents: AgentNode[];
  onTriggerHandshake: (agentId: string) => void;
  onAddAgent: (name: string, type: 'crok' | 'qwen' | 'copilot' | 'custom') => void;
  onSelectAgentForTest: (agentId: string) => void;
  onNavigateToBatch?: () => void;
}

export const OrchestratorOverview: React.FC<OrchestratorOverviewProps> = ({
  daemonState,
  agents,
  onTriggerHandshake,
  onAddAgent,
  onSelectAgentForTest,
  onNavigateToBatch,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentType, setNewAgentType] = useState<'crok' | 'qwen' | 'copilot' | 'custom'>('crok');
  const [copiedHash, setCopiedHash] = useState(false);

  const handleCopyLedger = () => {
    navigator.clipboard?.writeText(daemonState.sha3LedgerHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim()) return;
    onAddAgent(newAgentName.trim(), newAgentType);
    setNewAgentName('');
    setShowAddModal(false);
  };

  const threadUsagePercent = Math.round(
    (daemonState.threadsActive / daemonState.threadsTotal) * 100
  );

  return (
    <div className="space-y-6">
      {/* Top Telemetry Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kernel Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Sovereign Kernel
            </span>
            <Cpu className="w-4 h-4 text-sky-400" />
          </div>
          <p className="mt-2 text-sm font-bold text-white tracking-tight">
            Gyroid-Toroid v4.2
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Async TCP Socket Listener</span>
          </div>
        </div>

        {/* Chronos Scheduler Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Chronos Scheduler
            </span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-white font-mono">
              {daemonState.threadsActive}{' '}
              <span className="text-xs text-slate-400 font-normal">
                / {daemonState.threadsTotal} threads
              </span>
            </span>
            <span className="text-xs font-mono text-indigo-300 font-semibold">
              {threadUsagePercent}%
            </span>
          </div>
          <div className="mt-2.5 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-sky-500 to-indigo-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${threadUsagePercent}%` }}
            ></div>
          </div>
        </div>

        {/* SHA3 Consensus Ledger */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              SHA3 Ledger Hash
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-sm font-semibold text-emerald-400 truncate max-w-[170px]">
              {daemonState.sha3LedgerHash}
            </span>
            <button
              onClick={handleCopyLedger}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="Copy SHA3 block hash"
            >
              {copiedHash ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Coherence locked across all neural swarms
          </p>
        </div>

        {/* Handshake Verification Rate */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Handshake Rate
            </span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white font-mono">
              {daemonState.totalHandshakes}
            </span>
            <span className="text-xs text-emerald-400 font-medium">100% verified</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {daemonState.failedHandshakes} protocol rejections caught
          </p>
        </div>
      </div>

      {/* Agents Swarm Mesh Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Network className="w-4 h-4 text-sky-400" />
              <span>Sovereign Agent Lattice & Routing Table</span>
              <span className="px-2 py-0.5 text-xs font-mono bg-sky-950 text-sky-400 border border-sky-800/60 rounded-full">
                {agents.length} Nodes Active
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live endpoints participating in Gyroid-Toroid state consensus and Chronos execution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToBatch && (
              <button
                id="btn-goto-batch-queue"
                onClick={onNavigateToBatch}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-medium rounded-lg transition-colors shadow-sm"
              >
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Batch Queue</span>
              </button>
            )}

            <button
              id="btn-open-link-agent"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Link Crok / Custom Swarm</span>
            </button>
          </div>
        </div>

        {/* Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {agents.map((agent) => {
            const isConnected = agent.status === 'CONNECTED';
            const isHandshaking = agent.status === 'HANDSHAKING';

            return (
              <div
                key={agent.id}
                id={`card-agent-${agent.id}`}
                className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-4 transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center border font-bold text-xs ${
                        agent.type === 'crok'
                          ? 'bg-amber-950/40 text-amber-400 border-amber-800/50'
                          : agent.type === 'qwen'
                          ? 'bg-purple-950/40 text-purple-400 border-purple-800/50'
                          : agent.type === 'copilot'
                          ? 'bg-sky-950/40 text-sky-400 border-sky-800/50'
                          : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                      }`}
                    >
                      {agent.type.toUpperCase().substring(0, 3)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        {agent.name}
                      </h3>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">
                        {agent.id} • {agent.ipAddress}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${
                      isConnected
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                        : isHandshaking
                        ? 'bg-sky-950/60 text-sky-400 border-sky-800/60 animate-pulse'
                        : 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isConnected
                          ? 'bg-emerald-400'
                          : isHandshaking
                          ? 'bg-sky-400'
                          : 'bg-rose-400'
                      }`}
                    ></span>
                    {agent.status}
                  </span>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-900 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Latency</span>
                    <span className="font-mono text-slate-200 font-medium">
                      {agent.latencyMs} ms
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Key Signature</span>
                    <span className="font-mono text-emerald-400 font-medium truncate block">
                      {agent.keyFingerprint}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Packets</span>
                    <span className="font-mono text-slate-200 font-medium">
                      {agent.messagesSent} frames
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-900">
                  <span className="text-[11px] text-slate-400">
                    Endpoint: <code className="text-sky-300 font-mono">{agent.endpoint}</code>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      id={`btn-test-agent-${agent.id}`}
                      onClick={() => onSelectAgentForTest(agent.id)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-md transition-colors"
                    >
                      Inspector
                    </button>
                    <button
                      id={`btn-handshake-agent-${agent.id}`}
                      disabled={isHandshaking}
                      onClick={() => onTriggerHandshake(agent.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-200 bg-sky-950 hover:bg-sky-900 border border-sky-800 rounded-md transition-colors disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3 h-3 text-sky-400 ${
                          isHandshaking ? 'animate-spin' : ''
                        }`}
                      />
                      <span>Handshake</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Agent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-sky-400" />
              <span>Link New Neural Agent Swarm</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Registers a new agent instance into the Gyroid-Toroid routing table for consensus.
            </p>

            <form onSubmit={handleCreateAgent} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Agent Node Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Crok Beta Autonomous Hive"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Agent Subsystem Type
                </label>
                <select
                  value={newAgentType}
                  onChange={(e) =>
                    setNewAgentType(e.target.value as 'crok' | 'qwen' | 'copilot' | 'custom')
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="crok">Crok Agent (Sovereign Swarm)</option>
                  <option value="qwen">Qwen 2.5 (Sovereign Mesh Node)</option>
                  <option value="copilot">Copilot Endpoint</option>
                  <option value="custom">Custom Neural Swarm</option>
                </select>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">Default Endpoint Binding:</p>
                <p className="font-mono text-sky-400">
                  tcp://127.0.0.1:{daemonState.port}
                </p>
                <p>Status upon registration: ACTIVE</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors"
                >
                  Register Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
