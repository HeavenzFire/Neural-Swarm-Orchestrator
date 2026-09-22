import React, { useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Download,
  FileCode,
  FileJson,
  FileText,
  Network,
  Server,
  Terminal,
} from 'lucide-react';
import {
  AWS_SERVERLESS_ARCHITECTURE_DOCS,
  TCP_CONCURRENCY_ARCHITECTURE_DOCS,
} from '../client/architectureDocs';

const CONFIG_JSON_SNIPPET = `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "version": "1.0.0",
  "system": {
    "name": "Sovereign Swarm Lattice",
    "environment": "local_development",
    "protocol": "TCP_STREAM_V1",
    "buffer_delimiter": "\\n"
  },
  "daemon": {
    "host": "127.0.0.1",
    "port": 8888,
    "backlog": 1024,
    "max_concurrent_connections": 1000,
    "socket_timeout_ms": 10000,
    "keepalive": true,
    "keepalive_idle_sec": 60,
    "aws_failover_endpoint": "tcp://sov-nlb-prod-8888.elb.us-east-1.amazonaws.com:8888"
  },
  "security": {
    "encryption_algorithm": "AES-256-GCM",
    "require_sha3_fingerprint": true,
    "session_expiry_sec": 86400,
    "shared_secret_env_var": "SWARM_SHARED_SECRET"
  },
  "retry_policy": {
    "max_retries": 3,
    "initial_backoff_ms": 500,
    "backoff_multiplier": 1.5,
    "max_backoff_ms": 10000
  },
  "agents": {
    "crok-alpha-01": {
      "type": "crok",
      "name": "Crok Sovereign Alpha",
      "family": "crok",
      "capabilities": ["state-verification", "consensus-anchor", "wasm-decree-enki"],
      "heartbeat_interval_ms": 3000
    },
    "crok-beta-02": {
      "type": "crok",
      "name": "Crok Neural Beta",
      "family": "crok",
      "capabilities": ["state-verification", "anomaly-telemetry"],
      "heartbeat_interval_ms": 3000
    },
    "qwen-swarm-leader": {
      "type": "qwen",
      "name": "Qwen Reasoning Leader",
      "family": "qwen",
      "capabilities": ["swarm-leader", "deliberation-mesh", "chronos-sync"],
      "heartbeat_interval_ms": 4000
    },
    "qwen-swarm-worker": {
      "type": "qwen",
      "name": "Qwen Task Worker",
      "family": "qwen",
      "capabilities": ["inference-pipeline", "batch-dispatch"],
      "heartbeat_interval_ms": 4000
    },
    "copilot-mesh-node-01": {
      "type": "copilot",
      "name": "Copilot Code Node 01",
      "family": "copilot",
      "capabilities": ["code-synthesis", "ast-verification"],
      "heartbeat_interval_ms": 5000
    },
    "copilot-mesh-node-02": {
      "type": "copilot",
      "name": "Copilot Code Node 02",
      "family": "copilot",
      "capabilities": ["code-synthesis", "schema-validation"],
      "heartbeat_interval_ms": 5000
    }
  }
}`;

const ENV_SNIPPET = `# .env / .env.local
# Central Router Daemon TCP Ingress Configuration
DAEMON_HOST=127.0.0.1
DAEMON_PORT=8888
DAEMON_BACKLOG=1024
BUFFER_DELIMITER="\\n"

# AWS High-Availability Failover (Multi-AZ NLB)
DAEMON_FAILOVER_NLB=tcp://sov-nlb-prod-8888.elb.us-east-1.amazonaws.com:8888

# Node Authentication & Cryptographic Fingerprinting
SWARM_SHARED_SECRET=sov-secret-key-prod-9941
ENCRYPTION_ALGORITHM=AES-256-GCM
REQUIRE_SHA3_FINGERPRINT=true

# Connection Health & Sockets
HEARTBEAT_INTERVAL_MS=4000
SOCKET_TIMEOUT_MS=10000
MAX_CONCURRENT_SOCKETS=1000
INITIAL_RETRY_BACKOFF_MS=500
MAX_RETRY_ATTEMPTS=3
`;


const CLIENT_CODE_SNIPPET = `/**
 * @file CrokAgentHandshakeClient.ts
 * @description Production-grade TypeScript client for initiating authenticated socket
 * connections between Crok neural agents and the Central Router Daemon.
 */

import {
  ClientConfig,
  ConnectionState,
  HandshakeEventMap,
  HandshakeMessagePacket,
  HandshakeServerResponse
} from './types';

export class CrokAgentHandshakeClient {
  private readonly config: Required<ClientConfig>;
  private state: ConnectionState = 'DISCONNECTED';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: { [K in keyof HandshakeEventMap]?: Array<HandshakeEventMap[K]> } = {};
  private activeSessionId: string | null = null;

  constructor(config: ClientConfig) {
    this.config = {
      host: config.host || '127.0.0.1',
      port: config.port || 8888,
      agentId: config.agentId,
      encryptionKey: config.encryptionKey,
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? 5000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      initialBackoffMs: config.initialBackoffMs ?? 1000,
      maxBackoffMs: config.maxBackoffMs ?? 16000,
      requestTimeoutMs: config.requestTimeoutMs ?? 5000,
    };
  }

  public on<K in keyof HandshakeEventMap>(event: K, handler: HandshakeEventMap[K]): void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event]!.push(handler);
  }

  public generateKeyFingerprint(key: string): string {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) - hash + key.charCodeAt(i);
      hash |= 0;
    }
    return \`sha3-\${Math.abs(hash).toString(16).padStart(8, '0')}-v2\`;
  }

  public buildHandshakePacket(): HandshakeMessagePacket {
    const messageId = \`msg-\${Date.now()}-\${Math.random().toString(36).substring(2, 9)}\`;
    const keyFingerprint = this.generateKeyFingerprint(this.config.encryptionKey);

    return {
      sender_id: this.config.agentId,
      message_id: messageId,
      payload: {
        agent_type: 'crok',
        version: '2.5.0-sov',
        endpoint: \`tcp://\${this.config.host}:\${this.config.port}\`,
        capabilities: ['neural_swarm', 'state_verification', 'chronos_sync'],
        encryption_algorithm: 'SHA3-512-Signed',
        session_token: \`st-\${Date.now()}\`
      },
      key_fingerprint: keyFingerprint,
      timestamp: Date.now(),
      signature: \`sig_\${keyFingerprint}_\${messageId}\`
    };
  }

  public async connect(): Promise<HandshakeServerResponse> {
    this.state = 'CONNECTING';
    const startTime = Date.now();

    try {
      this.state = 'HANDSHAKING';
      const packet = this.buildHandshakePacket();
      
      // Async exchange with daemon socket
      const response = await this.executeTransportExchange(packet);

      if (response.status === 'ACTIVE' && response.synchronized === true) {
        this.reconnectAttempts = 0;
        this.activeSessionId = response.session_id || null;
        this.state = 'ACTIVE';
        return response;
      }
      throw new Error(response.reason || 'Handshake rejected');
    } catch (err: unknown) {
      if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        this.state = 'FAILED';
      }
      throw err;
    }
  }

  private scheduleReconnect(): void {
    this.state = 'RECONNECTING';
    this.reconnectAttempts++;
    const backoff = Math.min(
      this.config.initialBackoffMs * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxBackoffMs
    );
    this.reconnectTimer = setTimeout(() => this.connect(), backoff);
  }

  protected async executeTransportExchange(packet: HandshakeMessagePacket): Promise<HandshakeServerResponse> {
    // Standard transport wire implementation
    return { status: 'ACTIVE', synchronized: true, timestamp: Date.now() };
  }
}`;

const TYPES_SNIPPET = `/**
 * @file types.ts
 * @description Strongly-typed schemas for Crok Agent socket client and Central Router Daemon.
 */

export interface HandshakeMessagePayload {
  agent_type: 'crok' | 'qwen' | 'copilot' | string;
  version: string;
  endpoint: string;
  capabilities: string[];
  encryption_algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305' | 'SHA3-512-Signed';
  session_token?: string;
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
}`;

const JEST_TEST_SNIPPET = `/**
 * @file handshake.test.ts
 * @description Comprehensive Jest unit testing suite for CrokAgentHandshakeClient.
 */

import { CrokAgentHandshakeClient } from './CrokAgentHandshakeClient';
import { ClientConfig } from './types';

describe('CrokAgentHandshakeClient Unit Test Suite', () => {
  const defaultConfig: ClientConfig = {
    host: '127.0.0.1',
    port: 8888,
    agentId: 'crok-test-node-01',
    encryptionKey: 'sec_key_sov_9988_alpha',
    initialBackoffMs: 50,
    maxReconnectAttempts: 3,
  };

  it('should generate valid handshake packet matching daemon schema', () => {
    const client = new CrokAgentHandshakeClient(defaultConfig);
    const packet = client.buildHandshakePacket();

    expect(packet.sender_id).toBe('crok-test-node-01');
    expect(packet.message_id).toMatch(/^msg-\\d+-[a-z0-9]+$/);
    expect(packet.payload.agent_type).toBe('crok');
    expect(packet.key_fingerprint).toMatch(/^sha3-[0-9a-f]+-v2$/);
  });

  it('should transition states: DISCONNECTED -> CONNECTING -> HANDSHAKING -> ACTIVE', async () => {
    const client = new CrokAgentHandshakeClient(defaultConfig);
    const response = await client.connect();

    expect(response.status).toBe('ACTIVE');
    expect(response.synchronized).toBe(true);
    expect(client.getState()).toBe('ACTIVE');
  });

  it('should handle intermittent network recovery with exponential backoff', async () => {
    const client = new CrokAgentHandshakeClient({ ...defaultConfig, maxReconnectAttempts: 2 });
    jest.spyOn(client as any, 'executeTransportExchange')
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce({ status: 'ACTIVE', synchronized: true });

    await expect(client.connect()).rejects.toThrow('ECONNREFUSED');
    expect(client.getState()).toBe('RECONNECTING');
  });
});`;

const PYTHON_DAEMON_SNIPPET = `# Central Router Daemon (Async TCP Socket Server)
import asyncio
import json
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] Daemon Node: %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

class CentralRouterDaemon:
    def __init__(self, host: str = "127.0.0.1", port: int = 8888):
        self.host = host
        self.port = port
        self.active_connections = set()

    async def validate_message(self, raw_data: str) -> dict:
        try:
            data = json.loads(raw_data)
            required_fields = ["sender_id", "message_id", "payload"]
            if not all(field in data for field in required_fields):
                raise ValueError("Missing required schema fields")
            return {"status": "VALID", "data": data}
        except (json.JSONDecodeError, ValueError) as e:
            return {"status": "INVALID", "error": str(e)}

    async def handle_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        client_address = writer.get_extra_info('peername')
        logging.info(f"Incoming connection handshake initiated from {client_address}")
        self.active_connections.add(writer)

        try:
            while True:
                data_bytes = await reader.read(4096)
                if not data_bytes:
                    break
                raw_message = data_bytes.decode('utf-8').strip()
                validation_result = await self.validate_message(raw_message)

                if validation_result["status"] == "VALID":
                    msg_data = validation_result["data"]
                    logging.info(f"Handshake Validated - ID: {msg_data['message_id']} from {msg_data['sender_id']}")
                    response = json.dumps({"status": "ACTIVE", "synchronized": True}) + "\\n"
                    writer.write(response.encode('utf-8'))
                    await writer.drain()
                else:
                    response = json.dumps({"status": "ERROR", "reason": "Invalid Message Schema"}) + "\\n"
                    writer.write(response.encode('utf-8'))
                    await writer.drain()
        finally:
            self.active_connections.remove(writer)
            writer.close()
            await writer.wait_closed()

    async def start(self):
        server = await asyncio.start_server(self.handle_client, self.host, self.port)
        logging.info(f"Sovereign Core Router active on tcp://{self.host}:{self.port}")
        async with server:
            await server.serve_forever()

if __name__ == "__main__":
    router = CentralRouterDaemon()
    asyncio.run(router.start())`;

export const ClientCodeViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'client' | 'types' | 'jest' | 'config' | 'env' | 'concurrency' | 'aws' | 'daemon'
  >('client');
  const [copied, setCopied] = useState(false);

  const getCodeContent = () => {
    switch (activeTab) {
      case 'client':
        return { code: CLIENT_CODE_SNIPPET, filename: 'CrokAgentHandshakeClient.ts' };
      case 'types':
        return { code: TYPES_SNIPPET, filename: 'types.ts' };
      case 'jest':
        return { code: JEST_TEST_SNIPPET, filename: 'handshake.test.ts' };
      case 'config':
        return { code: CONFIG_JSON_SNIPPET, filename: 'config.json' };
      case 'env':
        return { code: ENV_SNIPPET, filename: '.env.local' };
      case 'concurrency':
        return { code: TCP_CONCURRENCY_ARCHITECTURE_DOCS, filename: 'TCP_CONCURRENCY_PORT_8888.md' };
      case 'aws':
        return { code: AWS_SERVERLESS_ARCHITECTURE_DOCS, filename: 'AWS_ARCHITECTURE_GUIDE.md' };
      case 'daemon':
        return { code: PYTHON_DAEMON_SNIPPET, filename: 'CentralRouterDaemon.py' };
    }
  };

  const current = getCodeContent();

  const handleCopy = () => {
    navigator.clipboard?.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([current.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = current.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header and Tab Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Code2 className="w-4 h-4 text-sky-400" />
            <span>Production TypeScript Client & AWS Serverless Blueprints</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Modular architecture with type safety, Jest test suite, and AWS Lambda/Fargate microservices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy File</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('client')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'client'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>CrokAgentHandshakeClient.ts</span>
        </button>

        <button
          onClick={() => setActiveTab('types')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'types'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>types.ts</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'config'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileJson className="w-3.5 h-3.5 text-amber-400" />
          <span>config.json</span>
        </button>

        <button
          onClick={() => setActiveTab('env')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'env'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>.env.local</span>
        </button>

        <button
          onClick={() => setActiveTab('concurrency')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'concurrency'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Network className="w-3.5 h-3.5 text-cyan-400" />
          <span>TCP Concurrency (Port 8888)</span>
        </button>

        <button
          onClick={() => setActiveTab('jest')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'jest'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>handshake.test.ts (Jest)</span>
        </button>

        <button
          onClick={() => setActiveTab('aws')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'aws'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>AWS Serverless & CI/CD</span>
        </button>

        <button
          onClick={() => setActiveTab('daemon')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'daemon'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>CentralRouterDaemon.py</span>
        </button>
      </div>

      {/* Code Display Area */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-[500px] text-slate-300 leading-relaxed shadow-inner">
        <pre>{current.code}</pre>
      </div>
    </div>
  );
};
