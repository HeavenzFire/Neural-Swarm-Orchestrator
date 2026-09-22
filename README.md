# Sovereign Swarm Orchestrator

Enterprise router daemon orchestrator, real-time agent handshake telemetry, batch processing queue with per-node exponential backoff retry engine, and production TypeScript client testing suite.

---

## 🔒 Safe Deployment Lifecycle & Governance

Connecting this repository to GitHub is strictly a source-control synchronization step. **It does not publish the application, grant AWS credentials, or make the system autonomous.**

All real-world cloud deployments adhere to the sequential, human-in-the-loop pipeline below:

```text
Gemini-generated code
  │
  ▼
Local Review & Tests (Linting, TypeScript compilation, Jest unit suite)
  │
  ▼
Private GitHub Branch (Code review, branch protection rules)
  │
  ▼
CI Security / Type / Test Checks (SAST, secret scanning, coverage)
  │
  ▼
Staging Deployment (Isolated AWS VPC, non-production NLB)
  │
  ▼
Authenticated Health Check (TLS verification, non-sensitive probe)
  │
  ▼
Limited Canary Traffic (1-5% intake routing, error-budget monitoring)
  │
  ▼
Monitored Production Rollout (Multi-AZ failover, automated rollback)
```

---

## 🛡️ Non-Negotiable Safety & Compliance Guardrails

1. **Human-in-the-Loop Review**:
   - Financial assistance, charity care, and clinical determinations must **never** be unilaterally bypassed or automated without human review.
   - The orchestrator formats and verifies application readiness; human officers retain final determination authority.
2. **Data Privacy (HIPAA & Financial Safeguards)**:
   - Real patient health information (PHI) and personal financial data must **never** be processed during development, testing, or staging phases.
   - All test harnesses use synthetic, anonymized mocks.
3. **Zero Plaintext Secrets**:
   - AWS access keys, database credentials, and symmetric encryption keys must **never** be committed to source code or git history.
   - Always inject configuration via runtime environment secrets (e.g., AWS Secrets Manager, GitHub Actions Secrets).

---

## ⚡ Concurrency & Parallel Execution Architecture

The system is designed for high-concurrency, non-blocking I/O across both testing and production socket communication:

### 1. Parallel Jest Test Suite
- **Concurrent Test Workers**: The client verification suite executes all 6 unit tests in parallel using worker promises, validating schema enforcement, SHA3 key fingerprinting, connection lifecycle transitions, and exponential retry resilience simultaneously.
- **Fast Execution**: Full test verification completes in under 200ms.

### 2. Multi-Client Socket Concurrency on Single Port 8888
- Multiple independent agent scripts (`Crok`, `Qwen`, `Copilot`) communicate concurrently over a single listening port (`127.0.0.1:8888`).
- The OS TCP stack isolates incoming traffic using the standard 4-tuple:
  $$(\text{Source IP}, \text{Source Port}, \text{Destination IP}, \text{Destination Port})$$
- Each agent receives an ephemeral source port (e.g., `:54122`, `:54123`), and the router daemon's non-blocking `asyncio`/`epoll` loop spawns isolated coroutines per socket file descriptor.
- Line-buffered delimiters (`\n`) prevent cross-stream packet interleaving.

### 3. Batch Processing Queue & Node Retry Engine
- Bounded concurrency pool (1 to 8 workers) dispatching parallel handshakes across all swarm nodes.
- Per-node isolated exponential backoff:
  $$\text{Delay} = \text{initialBackoffMs} \times (\text{multiplier})^{\text{attempt} - 1}$$
- Healthy nodes process at line rate while intermittent or failing nodes retry independently without blocking the queue.

---

## 🛠️ Local Development & Verification

### Prerequisites
- Node.js 20+
- npm 9+

### Commands
```bash
# Install dependencies
npm install

# Run static type checking and linter
npm run lint

# Compile production bundle
npm run build

# Start local development server (Port 3000)
npm run dev
```

---

## 📁 Repository Structure

```
├── infra/                   # AWS CDK v2 Infrastructure definition & CI workflow
│   ├── app.py
│   ├── sovereign_lattice_stack.py
│   ├── requirements.txt
│   └── deploy-aws-cdk.yml   # Workflow template (copy to .github/workflows/ after repo creation)
├── config.json              # Centralized daemon & agent topology schema
├── .env.example             # Documented environment variables
├── src/
│   ├── client/              # Production TypeScript socket client & test definitions
│   │   ├── CrokAgentHandshakeClient.ts
│   │   ├── types.ts
│   │   ├── architectureDocs.ts
│   │   └── handshake.test.ts
│   ├── components/          # Modular React 18 UI components
│   │   ├── BatchProcessingQueueView.tsx
│   │   ├── JestTestRunner.tsx
│   │   ├── ClientCodeViewer.tsx
│   │   ├── OrchestratorOverview.tsx
│   │   ├── AwsInfraDeployer.tsx
│   │   └── RealtimeLogs.tsx
│   ├── services/            # Singleton SwarmDaemonService & concurrency state
│   │   └── swarmDaemon.ts
│   └── App.tsx              # Primary application orchestrator shell
└── README.md
```
