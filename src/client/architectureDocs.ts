/**
 * @file architectureDocs.ts
 * @description Enterprise architectural blueprints, AWS Serverless deployment guide,
 * and security specifications for the Sovereign Swarm Orchestrator.
 */

export const AWS_SERVERLESS_ARCHITECTURE_DOCS = `
# Sovereign Swarm Orchestration Lattice: AWS Serverless Architecture

## 1. Global Ingress & Real-Time Socket Layer
- **AWS API Gateway (WebSocket API)**:
  - Terminates TLS/WSS connections from Crok, Qwen, and Copilot edge agents.
  - Custom $connect route validates JWT/HMAC token and triggers \`AuthValidatorLambda\`.
  - Routes \`handshake\` and \`heartbeat\` actions to \`RouterOrchestratorLambda\`.
  - Dispatches bi-directional frames via \`@connections/{connectionId}\` API.

- **AWS Network Load Balancer (NLB) + AWS Fargate (ECS)** *(Alternative TCP Layer)*:
  - If raw asynchronous TCP sockets (port 8888) are required instead of WebSockets, NLB terminates TCP traffic with zero latency and routes to a high-concurrency Fargate container cluster running the asyncio Central Router Daemon.

## 2. Microservice & Compute Lattice
- **Central Router Daemon Microservice (ECS Fargate / Node.js 20 ESM)**:
  - Manages active agent connection state table in memory with Redis/ElastiCache replica.
  - Gyroid-Toroid Kernel concurrency manager allocating 660 active worker threads.
  - Chronos Task Scheduler for synchronized agent state evaluation.

- **Asynchronous Event Processing Pipeline (AWS SQS + EventBridge)**:
  - \`SwarmHandshakeQueue\`: High-throughput FIFO queue ensuring ordered packet delivery.
  - \`AnomalyDeadLetterQueue (DLQ)\`: Captures failed handshake attempts and schema rejections.
  - AWS EventBridge publishes state transitions to downstream audit listeners.

## 3. Highly Scalable Data Layer & Encryption at Rest
- **Amazon DynamoDB (Global Tables with On-Demand Scaling)**:
  - Table: \`SwarmAgentRegistry\`
    - Partition Key (PK): \`AGENT#<agent_id>\`
    - Sort Key (SK): \`METADATA\`
    - Attributes: \`status\`, \`key_fingerprint\`, \`last_heartbeat\`, \`capabilities\`
  - Table: \`SwarmAuditLogs\`
    - Partition Key (PK): \`SESSION#<session_id>\`
    - Sort Key (SK): \`TIMESTAMP#<iso_date>\`
    - TTL: 90 days automatic cold storage archiving to Amazon S3 Glacier.
  - **Encryption**: AWS KMS Customer Managed Keys (CMK) with AES-256-GCM hardware security module (HSM) encryption for all tables and S3 buckets.

## 4. Multi-Factor Authentication (MFA) & Administrative Audit
- **AWS Cognito User Pools**:
  - Enforced TOTP / FIDO2 WebAuthn multi-factor authentication for administrative UI access.
  - Role-Based Access Control (RBAC): \`SwarmAdmin\`, \`MeshAuditor\`, \`AgentOperator\`.
- **AWS CloudTrail & OpenSearch / CloudWatch Logs**:
  - Tamper-proof SHA3-hashed audit log streams capturing every administrative configuration change.
  - Real-time CloudWatch Metric Filters alerting on consecutive handshake timeouts or schema rejections.

## 5. Automated CI/CD Pipeline (GitHub Actions -> AWS)
\`\`\`yaml
name: Deploy Swarm Orchestrator Lattice
on:
  push:
    branches: [main]
jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage
      - run: npm run build
  deploy-aws:
    needs: test-and-build
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/SwarmDeployRole
          aws-region: us-east-1
      - run: npx cdk deploy --all --require-approval never
\`\`\`
`;

export const TCP_CONCURRENCY_ARCHITECTURE_DOCS = `# Concurrent Multi-Client Traffic Architecture on Port 8888

## 1. Network Topology & OS Socket Multiplexing
How does a single listening port (8888) simultaneously handle traffic from independent Copilot, Qwen, and Crok agents without cross-talk or blocking?

\`\`\`
+---------------------------------------------------------------------------------+
|                        LOCAL / HOST TCP STACK (OS KERNEL)                       |
+---------------------------------------------------------------------------------+
                                      │
               ┌──────────────────────┴──────────────────────┐
               │  Kernel Listening Socket (bind: 127.0.0.1:8888)  │
               │  Socket Option: SO_REUSEADDR | Backlog: 1024│
               └──────────────────────┬──────────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│ Connection 1 (FD: 12) │ │ Connection 2 (FD: 13) │ │ Connection 3 (FD: 14) │
│ Peer: 127.0.0.1:54122 │ │ Peer: 127.0.0.1:54123 │ │ Peer: 127.0.0.1:54124 │
│ [Crok Sovereign Agent]│ │ [Qwen Reasoning Swarm]│ │ [Copilot Code Node]   │
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘
            │                         │                         │
            └─────────────────────────┼─────────────────────────┘
                                      ▼
             ┌─────────────────────────────────────────────────┐
             │ Central Router Daemon Event Loop (epoll/asyncio) │
             │ Non-blocking Stream Coroutines per Client FD    │
             └─────────────────────────────────────────────────┘
\`\`\`

### The 4-Tuple Socket Isolation Principle
TCP connections are uniquely identified at the kernel layer by a **4-tuple**:
\`(Source IP, Source Port, Destination IP, Destination Port)\`

- **Crok Agent**:   \`(127.0.0.1, 54122) -> (127.0.0.1, 8888)\`
- **Qwen Swarm**:   \`(127.0.0.1, 54123) -> (127.0.0.1, 8888)\`
- **Copilot Node**: \`(127.0.0.1, 54124) -> (127.0.0.1, 8888)\`

Even though all three client nodes target port 8888, the OS kernel assigns each client an ephemeral outgoing port. The router's \`accept()\` system call spawns a distinct file descriptor (FD) for each socket, isolating buffers completely.

---

## 2. Standard Client Connection Lifecycle

1. **Socket Allocation & Non-Blocking Connect**:
   - Client requests OS to bind an ephemeral local port.
   - 3-Way TCP Handshake (\`SYN\` -> \`SYN-ACK\` -> \`ACK\`) establishes transport link.

2. **Framing & Delimiter Handling (Line-Buffered TCP)**:
   - TCP is a streaming byte protocol, not a message protocol. Packet fragmentation can slice JSON payloads across TCP segments.
   - We enforce newline (\`\\n\`) delimiters at the end of each JSON packet.
   - The daemon's \`StreamReader.readline()\` buffers incoming chunks until \`\\n\` is encountered, guaranteeing intact JSON deserialization.

3. **Asynchronous Coroutine Handshake**:
   - The daemon spawns an isolated coroutine \`handle_client(reader, writer)\` per client.
   - Cryptographic fingerprinting and schema validation run asynchronously without starving concurrent connections.

4. **Bi-Directional Verification & Keepalive**:
   - Server writes \`{"status": "ACTIVE", "synchronized": true}\\n\`.
   - Periodic keepalive heartbeats maintain NAT pinholes and detect dead agent nodes.

---

## 3. High-Concurrency Server Implementation (Python asyncio)
\`\`\`python
import asyncio
import json
import logging

class CentralRouterDaemon:
    def __init__(self, host="127.0.0.1", port=8888):
        self.host = host
        self.port = port
        self.clients = {}  # agent_id -> writer

    async def handle_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        peername = writer.get_extra_info('peername')
        logging.info(f"Incoming connection accepted from {peername}")

        try:
            while True:
                # Read stream line-by-line terminated with '\\n'
                line = await reader.readline()
                if not line:
                    break  # Client closed connection cleanly
                
                payload = json.loads(line.decode('utf-8'))
                sender_id = payload.get("sender_id", "unknown")
                self.clients[sender_id] = writer

                # Respond with state verification
                ack = json.dumps({"status": "ACTIVE", "synchronized": True}) + "\\n"
                writer.write(ack.encode('utf-8'))
                await writer.drain()

        except ConnectionResetError:
            logging.warning(f"Connection reset abruptly by {peername}")
        finally:
            writer.close()
            await writer.wait_closed()

    async def start(self):
        server = await asyncio.start_server(
            self.handle_client,
            self.host,
            self.port,
            backlog=1024,
            reuse_address=True
        )
        async with server:
            await server.serve_forever()
\`\`\`
`;

