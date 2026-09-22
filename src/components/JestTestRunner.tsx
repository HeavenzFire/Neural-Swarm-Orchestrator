import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Play,
  RefreshCw,
  Terminal,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { JestTestCase } from '../types/orchestrator';
import { SwarmDaemonService } from '../services/swarmDaemon';

export const JestTestRunner: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [isParallelMode, setIsParallelMode] = useState(true);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<JestTestCase[]>([
    {
      id: 'test-1',
      suite: 'Handshake Packet Construction & Schema',
      title: 'should generate valid handshake packet matching daemon schema',
      status: 'passed',
      durationMs: 24,
      assertionsCount: 6,
      logs: [
        'PASS src/client/__tests__/handshake.test.ts',
        '✓ Instantiating CrokAgentHandshakeClient with config: { agentId: "crok-test-node-01" }',
        '✓ Validating schema fields: sender_id, message_id, payload',
        '✓ Checking payload.capabilities contains "neural_swarm"',
        '✓ Validating cryptographic timestamp format',
      ],
    },
    {
      id: 'test-2',
      suite: 'Cryptographic Key Verification',
      title: 'should produce deterministic SHA3 key fingerprint across identical keys',
      status: 'passed',
      durationMs: 18,
      assertionsCount: 3,
      logs: [
        '✓ Generating key fingerprint for "sec_key_sov_9988_alpha"',
        '✓ Expected: sha3-[0-9a-f]+-v2 format matching standard RFC',
        '✓ Comparing Client A and Client B generated digests',
      ],
    },
    {
      id: 'test-3',
      suite: 'Connection Lifecycle & Event Emission',
      title: 'should transition states: DISCONNECTED -> CONNECTING -> HANDSHAKING -> ACTIVE',
      status: 'passed',
      durationMs: 42,
      assertionsCount: 4,
      logs: [
        '✓ Subscribed to stateChange listener',
        '✓ Dispatched socket handshake packet to tcp://127.0.0.1:8888',
        '✓ Daemon returned structural confirmation: { status: "ACTIVE", synchronized: true }',
        '✓ State verified in ACTIVE mode; heartbeat loop initiated',
      ],
    },
    {
      id: 'test-4',
      suite: 'Intermittent Network Recovery',
      title: 'should handle transport failure and trigger exponential backoff reconnect',
      status: 'passed',
      durationMs: 68,
      assertionsCount: 4,
      logs: [
        '✓ Simulated ECONNREFUSED network drop on initial attempt',
        '✓ Handshake error captured: willRetry = true',
        '✓ Exponential backoff scheduled: initialBackoffMs = 50ms',
        '✓ Reconnection succeeded on second attempt; state recovered cleanly',
      ],
    },
    {
      id: 'test-5',
      suite: 'Schema Validation Security',
      title: 'should reject malformed packets missing sender_id or payload',
      status: 'passed',
      durationMs: 15,
      assertionsCount: 3,
      logs: [
        '✓ Constructed invalid packet with null payload',
        '✓ Exception caught: Missing required schema fields',
        '✓ Daemon safely rejected packet; no node desynchronization occurred',
      ],
    },
    {
      id: 'test-6',
      suite: 'Batch Queue & Per-Node Retry Engine',
      title: 'should schedule concurrent agent handshakes and recover failed nodes via individual exponential retry',
      status: 'passed',
      durationMs: 54,
      assertionsCount: 5,
      logs: [
        'PASS src/client/__tests__/batchQueue.test.ts',
        '✓ Enqueued 6 concurrent agent handshakes across swarm lattice',
        '✓ Simulated 35% chaos packet drops on initial attempt for 2 nodes',
        '✓ Verified isolated retry: Attempt 2/3 scheduled with exponential backoff (900ms)',
        '✓ All nodes successfully settled in ACTIVE consensus state',
        '✓ Throughput verified: > 12.5 handshakes/sec without cross-node blocking',
      ],
    },
  ]);

  const handleRunAllTests = async (forceParallel?: boolean) => {
    setIsRunning(true);
    setHasRun(true);
    const daemon = SwarmDaemonService.getInstance();
    const useParallel = forceParallel !== undefined ? forceParallel : isParallelMode;

    // Reset tests to running
    setTestCases((prev) => prev.map((t) => ({ ...t, status: 'idle', durationMs: 0 })));

    await daemon.runJestTestSuite((updatedTest) => {
      setTestCases((prev) =>
        prev.map((t) => (t.id === updatedTest.id ? { ...updatedTest } : t))
      );
    }, useParallel);

    setIsRunning(false);
  };

  const totalAssertions = testCases.reduce((acc, t) => acc + t.assertionsCount, 0);
  const totalDuration = testCases.reduce((acc, t) => acc + t.durationMs, 0);
  const passedCount = testCases.filter((t) => t.status === 'passed').length;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Test Suite Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80 rounded-md">
              PASS
            </span>
            <h2 className="text-base font-bold text-white font-mono">
              src/client/__tests__/handshake.test.ts
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-mono bg-sky-950 text-sky-300 border border-sky-800 rounded">
              {isParallelMode ? 'Parallel Concurrency (6 Workers)' : 'Sequential Mode'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Jest Unit Test Suite testing type safety, packet serialization, exponential backoff, and socket recovery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-toggle-parallel-mode"
            onClick={() => setIsParallelMode(!isParallelMode)}
            className={`px-2.5 py-2 text-xs font-medium rounded-lg border transition-colors ${
              isParallelMode
                ? 'bg-sky-950/80 text-sky-300 border-sky-800'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle concurrent parallel workers vs sequential execution"
          >
            {isParallelMode ? '⚡ Parallel: ON' : '🐢 Sequential'}
          </button>

          <button
            id="btn-run-all-parallel"
            onClick={() => handleRunAllTests(true)}
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-semibold rounded-lg transition-all shadow-sm disabled:opacity-50"
          >
            {isRunning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isRunning ? 'Running All in Parallel...' : 'Run All in Parallel'}</span>
          </button>
        </div>
      </div>

      {/* Test Results Summary Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-4">
          <span className="text-slate-400">
            Test Suites: <strong className="text-emerald-400 font-bold">1 passed</strong>, 1 total
          </span>
          <span className="text-slate-400">
            Tests:{' '}
            <strong className="text-emerald-400 font-bold">{passedCount} passed</strong>,{' '}
            {testCases.length} total
          </span>
          <span className="text-slate-400">
            Assertions: <strong className="text-sky-300 font-bold">{totalAssertions}</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Duration: {(totalDuration / 1000).toFixed(2)}s</span>
        </div>
      </div>

      {/* Test Cases List */}
      <div className="space-y-2">
        {testCases.map((test) => {
          const isExpanded = expandedTestId === test.id;
          const isPassed = test.status === 'passed';
          const isTestRunning = test.status === 'running';

          return (
            <div
              key={test.id}
              className="bg-slate-950/70 border border-slate-800/80 rounded-xl overflow-hidden transition-colors"
            >
              <button
                type="button"
                onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-900/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isTestRunning ? (
                    <RefreshCw className="w-4 h-4 text-sky-400 animate-spin" />
                  ) : isPassed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 block">
                      {test.suite}
                    </span>
                    <span className="text-xs font-medium text-slate-200">{test.title}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
                  <span className="text-slate-400">
                    {test.durationMs ? `${test.durationMs}ms` : '--'}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="p-3 bg-slate-950 border-t border-slate-800/60 font-mono text-[11px] space-y-1 text-slate-300">
                  {test.logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-slate-600 select-none">&gt;</span>
                      <span className={log.startsWith('✓') ? 'text-emerald-400' : 'text-slate-300'}>
                        {log}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 text-[10px] text-slate-400">
                    Verified {test.assertionsCount} Jest assertions for this test spec.
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
