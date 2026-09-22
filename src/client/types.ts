/**
 * @file types.ts
 * @description Strongly-typed schemas for Crok Agent socket client and Central Router Daemon communication.
 */

export interface HandshakeMessagePayload {
  agent_type: 'crok' | 'qwen' | 'copilot' | string;
  version: string;
  endpoint: string;
  capabilities: string[];
  encryption_algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305' | 'SHA3-512-Signed';
  session_token?: string;
  metadata?: Record<string, unknown>;
}

export interface HandshakeMessagePacket {
  sender_id: string;
  message_id: string;
  payload: HandshakeMessagePayload;
  key_fingerprint: string;
  timestamp: number;
  signature?: string;
}

export interface HandshakeServerResponse {
  status: 'ACTIVE' | 'ERROR';
  synchronized: boolean;
  reason?: string;
  session_id?: string;
  timestamp?: number;
}

export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'HANDSHAKING' | 'ACTIVE' | 'RECONNECTING' | 'FAILED';

export interface ClientConfig {
  host: string;
  port: number;
  agentId: string;
  encryptionKey: string;
  heartbeatIntervalMs?: number;
  maxReconnectAttempts?: number;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
  requestTimeoutMs?: number;
}

export interface HandshakeEventMap {
  stateChange: (newState: ConnectionState, previousState: ConnectionState) => void;
  handshakeSuccess: (response: HandshakeServerResponse, durationMs: number) => void;
  handshakeError: (error: Error, willRetry: boolean) => void;
  packetSent: (packet: HandshakeMessagePacket) => void;
  packetReceived: (data: unknown) => void;
  log: (level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: unknown) => void;
}
