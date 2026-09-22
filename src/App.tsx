/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { OrchestratorOverview } from './components/OrchestratorOverview';
import { HandshakeLiveTester } from './components/HandshakeLiveTester';
import { RealtimeLogs } from './components/RealtimeLogs';
import { JestTestRunner } from './components/JestTestRunner';
import { ClientCodeViewer } from './components/ClientCodeViewer';
import { AwsInfraDeployer } from './components/AwsInfraDeployer';
import { BatchProcessingQueueView } from './components/BatchProcessingQueueView';
import { ConfigPanel } from './components/ConfigPanel';
import { AlertNotification, NotificationToast } from './components/NotificationToast';
import { SwarmDaemonService } from './services/swarmDaemon';
import {
  AgentNode,
  AutomationEngineState,
  BatchQueueConfig,
  BatchQueueState,
  DaemonState,
  TelemetryLog,
  UserConfig,
} from './types/orchestrator';

export default function App() {
  const daemon = SwarmDaemonService.getInstance();

  const [daemonState, setDaemonState] = useState<DaemonState>(daemon.getState());
  const [agents, setAgents] = useState<AgentNode[]>(daemon.getAgents());
  const [logs, setLogs] = useState<TelemetryLog[]>(daemon.getLogs());
  const [config, setConfig] = useState<UserConfig>(daemon.getConfig());
  const [batchQueueState, setBatchQueueState] = useState<BatchQueueState>(daemon.getBatchQueueState());
  const [batchConfig, setBatchConfig] = useState<BatchQueueConfig>(daemon.getBatchConfig());
  const [automationState, setAutomationState] = useState<AutomationEngineState>(daemon.getAutomationState());
  const [activeTab, setActiveTab] = useState<'orchestrator' | 'batch' | 'aws' | 'tests' | 'code'>('orchestrator');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('crok-alpha-01');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);

  useEffect(() => {
    // Subscribe to state machine updates
    const unsubscribeState = daemon.subscribe(() => {
      setDaemonState(daemon.getState());
      setAgents(daemon.getAgents());
      setLogs(daemon.getLogs());
      setConfig(daemon.getConfig());
      setBatchQueueState(daemon.getBatchQueueState());
      setBatchConfig(daemon.getBatchConfig());
      setAutomationState(daemon.getAutomationState());
    });

    // Subscribe to real-time notification alerts
    const unsubscribeAlerts = daemon.onAlert((alert) => {
      const newAlert: AlertNotification = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: alert.title,
        message: alert.message,
        type: alert.type,
      };
      setNotifications((prev) => [newAlert, ...prev.slice(0, 4)]);

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== newAlert.id));
      }, 6000);
    });

    return () => {
      unsubscribeState();
      unsubscribeAlerts();
    };
  }, [daemon]);

  const handleDismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleTogglePower = () => {
    daemon.toggleDaemonPower();
  };

  const handleQuickHandshake = () => {
    const targetAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];
    if (targetAgent) {
      daemon.executeHandshakeTransaction(targetAgent.id);
    }
  };

  const handleSelectAgentForTest = (agentId: string) => {
    setSelectedAgentId(agentId);
    setActiveTab('orchestrator');
    const element = document.getElementById('btn-run-live-handshake');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveConfig = (newConfig: Partial<UserConfig>) => {
    daemon.saveConfig(newConfig);
  };

  const handleAddAgent = (name: string, type: 'crok' | 'qwen' | 'copilot' | 'custom') => {
    daemon.registerAgent(name, type);
  };

  const handleToggleAutomation = () => {
    daemon.toggleAutomation();
  };

  const handleSetAutomationCadence = (
    cadenceMs: number,
    mode: 'BALANCED' | 'AGGRESSIVE' | 'CONSERVATIVE'
  ) => {
    daemon.setAutomationCadence(cadenceMs, mode);
  };

  const handleImmediateSweep = () => {
    daemon.triggerImmediateAutonomousSweep();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation & Status Bar */}
      <Header
        state={daemonState}
        automation={automationState}
        onTogglePower={handleTogglePower}
        onToggleAutomation={handleToggleAutomation}
        onSetCadence={handleSetAutomationCadence}
        onImmediateSweep={handleImmediateSweep}
        onOpenConfig={() => setIsConfigOpen(true)}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onQuickHandshake={handleQuickHandshake}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeTab === 'orchestrator' && (
          <>
            {/* Core Daemon Telemetry & Agent Swarm Lattice */}
            <OrchestratorOverview
              daemonState={daemonState}
              agents={agents}
              onTriggerHandshake={(id) => daemon.executeHandshakeTransaction(id)}
              onAddAgent={handleAddAgent}
              onSelectAgentForTest={handleSelectAgentForTest}
              onNavigateToBatch={() => setActiveTab('batch')}
            />

            {/* Interactive Handshake & Anomaly Injection Testbench */}
            <HandshakeLiveTester
              agents={agents}
              selectedAgentId={selectedAgentId}
              onSelectAgent={setSelectedAgentId}
              onExecuteHandshake={(id, opts) => daemon.executeHandshakeTransaction(id, opts)}
            />

            {/* Real-Time Handshake Metrics, Telemetry & Cloud Storage Archival */}
            <RealtimeLogs
              logs={logs}
              onClear={() => daemon.clearLogs()}
              onCloudExport={() => daemon.scheduleCloudExport()}
            />
          </>
        )}

        {activeTab === 'tests' && (
          <div className="space-y-6">
            <JestTestRunner />
            <RealtimeLogs
              logs={logs}
              onClear={() => daemon.clearLogs()}
              onCloudExport={() => daemon.scheduleCloudExport()}
            />
          </div>
        )}

        {activeTab === 'batch' && (
          <div className="space-y-6">
            <BatchProcessingQueueView
              agents={agents}
              queueState={batchQueueState}
              queueConfig={batchConfig}
              onDispatchBatch={(agentIds, cfg) => daemon.dispatchBatchHandshake(agentIds, cfg)}
              onPauseQueue={() => daemon.pauseBatchQueue()}
              onResumeQueue={() => daemon.resumeBatchQueue()}
              onCancelQueue={() => daemon.cancelBatchQueue()}
              onRetryFailed={() => daemon.retryFailedBatchJobs()}
              isNlbMode={daemon.getEndpointMode() === 'aws_nlb'}
            />
            <RealtimeLogs
              logs={logs}
              onClear={() => daemon.clearLogs()}
              onCloudExport={() => daemon.scheduleCloudExport()}
            />
          </div>
        )}

        {activeTab === 'aws' && (
          <div className="space-y-6">
            <AwsInfraDeployer
              onApplyEndpointToTester={() => {
                setActiveTab('orchestrator');
                const element = document.getElementById('btn-run-live-handshake');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {activeTab === 'code' && (
          <div className="space-y-6">
            <ClientCodeViewer />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Sovereign Neural Swarm Orchestrator Daemon • Gyroid-Toroid v4.2 • Chronos Scheduler
          </span>
          <span className="font-mono text-slate-400">
            SHA3-Ledger: <span className="text-emerald-400">{daemonState.sha3LedgerHash}</span> • Port 8888
          </span>
        </div>
      </footer>

      {/* Configuration Modal Drawer */}
      <ConfigPanel
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSave={handleSaveConfig}
      />

      {/* Floating Real-Time Notifications & Anomaly Alerts */}
      <NotificationToast
        notifications={notifications}
        onDismiss={handleDismissNotification}
      />
    </div>
  );
}
