/**
 * Sovereign Swarm Orchestrator Types
 */

export type DaemonStatus = 'ACTIVE' | 'INITIALIZING' | 'DEGRADED' | 'OFFLINE';

export type AgentStatus = 'CONNECTED' | 'HANDSHAKING' | 'DISCONNECTED' | 'ERROR';

export type AgentType = 'crok' | 'qwen' | 'copilot' | 'custom';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';

export interface AgentNode {
  id: string;
  name: string;
  type: AgentType;
  endpoint: string;
  status: AgentStatus;
  latencyMs: number;
  lastSync: string;
  encryptionKeyVerified: boolean;
  messagesSent: number;
  messagesReceived: number;
  ipAddress: string;
  keyFingerprint: string;
}

export interface DaemonState {
  status: DaemonStatus;
  synchronized: boolean;
  host: string;
  port: number;
  kernelState: string;
  schedulerName: string;
  threadsTotal: number;
  threadsActive: number;
  sha3LedgerHash: string;
  activeSocketsCount: number;
  uptimeSeconds: number;
  totalHandshakes: number;
  failedHandshakes: number;
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  event: string;
  details: string;
  payload?: any;
}

export interface HandshakePacket {
  sender_id: string;
  message_id: string;
  payload: {
    agent_type: string;
    capabilities: string[];
    version: string;
    endpoint: string;
    auth_token?: string;
    sync_interval_ms?: number;
    [key: string]: any;
  };
  key_fingerprint: string;
  timestamp: number;
  signature?: string;
}

export interface HandshakeResponse {
  status: 'ACTIVE' | 'ERROR';
  synchronized: boolean;
  reason?: string;
  timestamp: number;
  session_id: string;
  active_connections: number;
}

export interface UserConfig {
  syncIntervalMs: number;
  encryptionProtocol: 'AES-256-GCM' | 'ChaCha20-Poly1305' | 'SHA3-512-Signed';
  retryMaxAttempts: number;
  retryBackoffMs: number;
  mfaEnabled: boolean;
  autoExportLogs: boolean;
  cloudStorageBucket: string;
  cloudStorageRegion: string;
  anomalyAlertThresholdMs: number;
  strictSchemaValidation: boolean;
}

export interface JestTestCase {
  id: string;
  title: string;
  suite: string;
  status: 'idle' | 'running' | 'passed' | 'failed';
  durationMs: number;
  assertionsCount: number;
  error?: string;
  logs: string[];
}

export interface AwsInfrastructureState {
  deployed: boolean;
  nlbEndpoint: string;
  nlbStatus: 'HEALTHY' | 'PROVISIONING' | 'DEGRADED';
  az1Status: 'HEALTHY' | 'UNHEALTHY' | 'STOPPED';
  az2Status: 'HEALTHY' | 'UNHEALTHY' | 'STOPPED';
  dynamoTable: string;
  dynamoStatus: 'ACTIVE' | 'UPDATING';
  replicaRegion: string;
  activeTargetAz: 'AZ-1' | 'AZ-2' | 'BOTH';
  lastHealthCheck: string;
  cloudFormationEvents: Array<{
    timestamp: string;
    resource: string;
    type: string;
    status: string;
  }>;
}

export type BatchJobStatus = 'QUEUED' | 'PROCESSING' | 'SUCCESS' | 'RETRYING' | 'FAILED';

export interface BatchJob {
  id: string;
  agentId: string;
  agentName: string;
  agentType: string;
  status: BatchJobStatus;
  attempts: number;
  maxRetries: number;
  latencyMs: number;
  lastAttemptTime?: number;
  errorReason?: string;
  backoffDelayMs: number;
  sessionId?: string;
  targetEndpoint: string;
  decreeAnchor?: string;
}

export interface BatchQueueConfig {
  concurrency: number;
  maxRetries: number;
  initialBackoffMs: number;
  backoffMultiplier: number;
  injectChaosRate: number; // 0 to 1 for simulated flaky nodes to test retry logic
  operationName?: string;
  decreeHash?: string;
}

export interface BatchQueueState {
  batchId: string;
  operationName: string;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  concurrency: number;
  maxRetries: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  retryingJobs: number;
  inFlightJobs: number;
  startTime?: number;
  endTime?: number;
  throughputRate: number;
  jobs: BatchJob[];
}


