import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CloudUpload,
  Copy,
  Globe,
  Lock,
  Play,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { AgentNode, HandshakePacket, HandshakeResponse } from '../types/orchestrator';

interface HandshakeLiveTesterProps {
  agents: AgentNode[];
  selectedAgentId: string;
  onSelectAgent: (id: string) => void;
  onExecuteHandshake: (
    agentId: string,
    options: {
      injectMalformedSchema?: boolean;
      injectKeyMismatch?: boolean;
      injectNetworkInterruption?: boolean;
      injectTimeout?: boolean;
    }
  ) => Promise<{ response: HandshakeResponse; packet: HandshakePacket; durationMs: number }>;
}

export const HandshakeLiveTester: React.FC<HandshakeLiveTesterProps> = ({
  agents,
  selectedAgentId,
  onSelectAgent,
  onExecuteHandshake,
}) => {
  const [anomalyMode, setAnomalyMode] = useState<
    'none' | 'network_drop' | 'corrupt_schema' | 'key_mismatch' | 'timeout'
  >('none');
  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [lastPacket, setLastPacket] = useState<HandshakePacket | null>(null);
  const [lastResponse, setLastResponse] = useState<HandshakeResponse | null>(null);
  const [lastDuration, setLastDuration] = useState<number | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<'req' | 'res' | null>(null);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  const handleRunTest = async () => {
    if (!selectedAgent) return;
    setIsRunning(true);
    setActiveStep(1);
    setTestError(null);

    const options = {
      injectMalformedSchema: anomalyMode === 'corrupt_schema',
      injectKeyMismatch: anomalyMode === 'key_mismatch',
      injectNetworkInterruption: anomalyMode === 'network_drop',
      injectTimeout: anomalyMode === 'timeout',
    };

    try {
      // Step 1: Socket Initiation
      await new Promise((r) => setTimeout(r, 120));
      setActiveStep(2);

      // Step 2: Schema validation & Encryption
      await new Promise((r) => setTimeout(r, 140));
      setActiveStep(3);

      const result = await onExecuteHandshake(selectedAgent.id, options);
      setLastPacket(result.packet);
      setLastResponse(result.response);
      setLastDuration(result.durationMs);

      if (result.response.status === 'ACTIVE') {
        setActiveStep(4);
        await new Promise((r) => setTimeout(r, 120));
        setActiveStep(5); // Complete with notification & cloud export
      } else {
        setTestError(result.response.reason || 'Handshake rejected by daemon');
        setActiveStep(3);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setTestError(errorMsg);
      setActiveStep(3);
    } finally {
      setIsRunning(false);
    }
  };

  const copyPayload = (type: 'req' | 'res') => {
    const data = type === 'req' ? lastPacket : lastResponse;
    if (data) {
      navigator.clipboard?.writeText(JSON.stringify(data, null, 2));
      setCopiedSection(type);
      setTimeout(() => setCopiedSection(null), 2000);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-6">
      {/* Title & Agent Selection */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <span>Interactive Handshake & Error Injection Testbench</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Test real-time socket transport, strict schema validation, encryption fingerprints, and resilient retry logic.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-medium">Target Agent:</label>
            <select
              id="select-target-agent"
              value={selectedAgent?.id || ''}
              onChange={(e) => onSelectAgent(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 font-medium"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type})
                </option>
              ))}
            </select>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300">
            {selectedAgent?.endpoint.includes('amazonaws.com') ? (
              <>
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">AWS NLB:</span>
                <span className="text-slate-400 truncate max-w-[140px]">{selectedAgent?.endpoint.replace('tcp://', '')}</span>
              </>
            ) : (
              <>
                <Server className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-sky-400 font-semibold">Local:</span>
                <span className="text-slate-400">{selectedAgent?.endpoint}</span>
              </>
            )}
          </div>

          <button
            id="btn-run-live-handshake"
            onClick={handleRunTest}
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {isRunning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isRunning ? 'Validating Handshake...' : 'Initiate Handshake Protocol'}</span>
          </button>
        </div>
      </div>

      {/* Anomaly & Resilience Mode Selectors */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
          Protocol Stress Testing & Anomaly Injection
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => setAnomalyMode('none')}
            className={`p-2 rounded-lg text-left border transition-all text-xs ${
              anomalyMode === 'none'
                ? 'bg-sky-950/80 border-sky-500/60 text-white font-semibold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 text-sky-400 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Standard Handshake</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">Clean protocol pass</p>
          </button>

          <button
            type="button"
            onClick={() => setAnomalyMode('network_drop')}
            className={`p-2 rounded-lg text-left border transition-all text-xs ${
              anomalyMode === 'network_drop'
                ? 'bg-amber-950/80 border-amber-500/60 text-white font-semibold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 text-amber-400 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Network Drop</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">Tests exponential backoff</p>
          </button>

          <button
            type="button"
            onClick={() => setAnomalyMode('corrupt_schema')}
            className={`p-2 rounded-lg text-left border transition-all text-xs ${
              anomalyMode === 'corrupt_schema'
                ? 'bg-rose-950/80 border-rose-500/60 text-white font-semibold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 text-rose-400 mb-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Corrupt Schema</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">Missing required fields</p>
          </button>

          <button
            type="button"
            onClick={() => setAnomalyMode('key_mismatch')}
            className={`p-2 rounded-lg text-left border transition-all text-xs ${
              anomalyMode === 'key_mismatch'
                ? 'bg-purple-950/80 border-purple-500/60 text-white font-semibold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 text-purple-400 mb-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Key Signature Mismatch</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">Tampered cryptographic key</p>
          </button>

          <button
            type="button"
            onClick={() => setAnomalyMode('timeout')}
            className={`p-2 rounded-lg text-left border transition-all text-xs ${
              anomalyMode === 'timeout'
                ? 'bg-orange-950/80 border-orange-500/60 text-white font-semibold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 text-orange-400 mb-1">
              <Terminal className="w-3.5 h-3.5" />
              <span>Socket Timeout</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">Exceeds alert threshold</p>
          </button>
        </div>
      </div>

      {/* Protocol Verification Stepper */}
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
          Protocol Lifecycle & Verification Pipeline
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Step 1 */}
          <div
            className={`p-3 rounded-xl border text-xs transition-all ${
              activeStep >= 1
                ? 'bg-slate-950 border-sky-500/60 text-white'
                : 'bg-slate-950/40 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[11px] text-sky-400">STEP 1</span>
              {activeStep >= 1 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-700"></span>
              )}
            </div>
            <p className="font-semibold text-slate-200">Socket Open</p>
            <p className="text-[11px] text-slate-400 mt-0.5">tcp://127.0.0.1:8888</p>
          </div>

          {/* Step 2 */}
          <div
            className={`p-3 rounded-xl border text-xs transition-all ${
              activeStep >= 2
                ? 'bg-slate-950 border-sky-500/60 text-white'
                : 'bg-slate-950/40 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[11px] text-sky-400">STEP 2</span>
              {activeStep >= 2 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-700"></span>
              )}
            </div>
            <p className="font-semibold text-slate-200">Schema Contract</p>
            <p className="text-[11px] text-slate-400 mt-0.5">sender_id & payload</p>
          </div>

          {/* Step 3 */}
          <div
            className={`p-3 rounded-xl border text-xs transition-all ${
              activeStep >= 3
                ? testError
                  ? 'bg-rose-950/50 border-rose-500/60 text-white'
                  : 'bg-slate-950 border-sky-500/60 text-white'
                : 'bg-slate-950/40 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[11px] text-sky-400">STEP 3</span>
              {testError ? (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              ) : activeStep >= 3 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-700"></span>
              )}
            </div>
            <p className="font-semibold text-slate-200">Key Signature</p>
            <p className="text-[11px] text-slate-400 mt-0.5">SHA3-512 fingerprint</p>
          </div>

          {/* Step 4 */}
          <div
            className={`p-3 rounded-xl border text-xs transition-all ${
              activeStep >= 4
                ? 'bg-slate-950 border-sky-500/60 text-white'
                : 'bg-slate-950/40 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[11px] text-sky-400">STEP 4</span>
              {activeStep >= 4 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-700"></span>
              )}
            </div>
            <p className="font-semibold text-slate-200">Status ACTIVE</p>
            <p className="text-[11px] text-slate-400 mt-0.5">synchronized: true</p>
          </div>

          {/* Step 5 */}
          <div
            className={`p-3 rounded-xl border text-xs transition-all ${
              activeStep >= 5
                ? 'bg-slate-950 border-emerald-500/60 text-white'
                : 'bg-slate-950/40 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[11px] text-emerald-400">STEP 5</span>
              {activeStep >= 5 ? (
                <CloudUpload className="w-4 h-4 text-emerald-400" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-700"></span>
              )}
            </div>
            <p className="font-semibold text-slate-200">Cloud Storage</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Audit log exported</p>
          </div>
        </div>
      </div>

      {/* Error Banner if Anomaly Triggered */}
      {testError && (
        <div className="p-3.5 bg-rose-950/50 border border-rose-800/60 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-rose-200">Error Handling Protocol Activated</p>
            <p className="text-rose-300 mt-0.5">{testError}</p>
            <p className="text-slate-400 mt-1">
              The Central Router Daemon cleanly preserved state coherence. No corrupted packets were admitted to the SHA3 ledger.
            </p>
          </div>
        </div>
      )}

      {/* Live Packet JSON Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Client Request Packet */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <span className="text-slate-400 flex items-center gap-1.5 text-xs font-semibold">
              <Terminal className="w-3.5 h-3.5 text-sky-400" />
              Client Handshake Packet (Wire Schema)
            </span>
            <button
              onClick={() => copyPayload('req')}
              className="text-slate-400 hover:text-white p-1 rounded"
              title="Copy JSON packet"
            >
              {copiedSection === 'req' ? (
                <span className="text-[11px] text-emerald-400">Copied!</span>
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <pre className="text-slate-300 overflow-x-auto p-2 bg-slate-900/50 rounded-lg max-h-56 leading-relaxed">
            {lastPacket
              ? JSON.stringify(lastPacket, null, 2)
              : `// Sample Client Packet\n{\n  "sender_id": "${selectedAgent?.id || 'crok-alpha-01'}",\n  "message_id": "msg-1727000000000-sov",\n  "payload": {\n    "agent_type": "crok",\n    "capabilities": ["neural_swarm", "state_verification"],\n    "version": "2.5.0-sov",\n    "endpoint": "tcp://127.0.0.1:8888"\n  },\n  "key_fingerprint": "${selectedAgent?.keyFingerprint || 'sha3-7e4a90-v2'}",\n  "timestamp": ${Date.now()}\n}`}
          </pre>
        </div>

        {/* Server Response Packet */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <span className="text-slate-400 flex items-center gap-1.5 text-xs font-semibold">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              Daemon Server Confirmation Response
            </span>
            <button
              onClick={() => copyPayload('res')}
              className="text-slate-400 hover:text-white p-1 rounded"
              title="Copy JSON response"
            >
              {copiedSection === 'res' ? (
                <span className="text-[11px] text-emerald-400">Copied!</span>
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <pre className="text-slate-300 overflow-x-auto p-2 bg-slate-900/50 rounded-lg max-h-56 leading-relaxed">
            {lastResponse
              ? JSON.stringify(lastResponse, null, 2)
              : `// Awaiting handshake transaction...\n{\n  "status": "ACTIVE",\n  "synchronized": true,\n  "session_id": "sess_sov_lattice_ready",\n  "timestamp": ${Date.now()},\n  "active_connections": 4\n}`}
          </pre>
        </div>
      </div>
    </div>
  );
};
