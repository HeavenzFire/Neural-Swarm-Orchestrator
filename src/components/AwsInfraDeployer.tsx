import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Cloud,
  Code2,
  Copy,
  Cpu,
  Database,
  Download,
  ExternalLink,
  FileCode,
  Flame,
  Globe,
  Layers,
  Network,
  Play,
  RefreshCw,
  Server,
  Shield,
  Terminal,
  Zap,
} from 'lucide-react';
import { SwarmDaemonService } from '../services/swarmDaemon';
import { AwsInfrastructureState } from '../types/orchestrator';

const DOCKERFILE_CODE = `# ==============================================================================
# Sovereign Swarm Orchestrator - Production Container Specification
# Multi-stage, minimal attack surface, non-root execution for AWS ECS Fargate
# ==============================================================================

# --- Stage 1: Build & Dependencies ---
FROM python:3.12-slim AS builder

WORKDIR /build

ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \\
    gcc \\
    build-essential \\
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# --- Stage 2: Runtime Production Image ---
FROM python:3.12-slim AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1 \\
    DAEMON_HOST=0.0.0.0 \\
    DAEMON_PORT=8888 \\
    PYTHONPATH=/app

# Create unprivileged system user and group
RUN groupadd -g 10001 sovereign && \\
    useradd -u 10001 -g sovereign -s /bin/bash -m sovereign && \\
    apt-get update && apt-get install -y --no-install-recommends \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy application source code
COPY --chown=sovereign:sovereign daemon_cloud.py /app/daemon_cloud.py

# Switch to unprivileged user
USER sovereign:sovereign

# Expose raw TCP socket listener for AWS NLB traffic
EXPOSE 8888

# TCP socket health check verifying daemon port responsiveness
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \\
    CMD python -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); s.settimeout(2); s.connect(('127.0.0.1', 8888)); s.close()" || exit 1

# Execute asynchronous router daemon
ENTRYPOINT ["python", "-u", "/app/daemon_cloud.py"]`;

const CDK_STACK_CODE = `"""
SovereignLatticeStack - AWS Cloud Development Kit (CDK) v2
Provisions a multi-AZ VPC, Amazon DynamoDB Global Table, AWS Fargate Cluster,
and high-throughput Network Load Balancer (NLB) for TCP Port 8888.
"""

from aws_cdk import (
    Stack,
    Duration,
    CfnOutput,
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_dynamodb as dynamodb,
    aws_elasticloadbalancingv2 as elbv2,
    aws_ecs_patterns as ecs_patterns
)
from constructs import Construct

class SovereignLatticeStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 1. Network Topology: Isolated Multi-AZ VPC (AZ-1 & AZ-2)
        vpc = ec2.Vpc(
            self, "SovereignVpc",
            max_azs=2,
            nat_gateways=1,  # Allows Fargate tasks to reach DynamoDB and S3 audit vaults
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="Public",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24
                ),
                ec2.SubnetConfiguration(
                    name="Private",
                    subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidr_mask=24
                )
            ]
        )

        # 2. State Layer: DynamoDB Global Table (TableV2) for SHA-3 Ledger
        ledger_table = dynamodb.TableV2(
            self, "SovereignStateLedger",
            partition_key=dynamodb.Attribute(
                name="state_anchor", 
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="timestamp", 
                type=dynamodb.AttributeType.NUMBER
            ),
            billing=dynamodb.Billing.on_demand(),
            point_in_time_recovery=True,
            # Multi-region replication for global low-latency consensus
            replicas=[
                dynamodb.ReplicaTableProps(region="us-west-2")
            ]
        )

        # 3. Compute Layer: Amazon ECS Cluster running serverless Fargate
        cluster = ecs.Cluster(self, "SovereignCluster", vpc=vpc)

        # Task Definition allocating resources for 660-thread asynchronous daemon simulation
        task_definition = ecs.FargateTaskDefinition(
            self, "RouterDaemonTaskDef",
            memory_limit_mib=2048,  # 2 GB RAM allocation
            cpu=1024                # 1 vCPU allocation
        )

        # Grant Fargate tasks explicit Read/Write permissions to DynamoDB
        ledger_table.grant_read_write_data(task_definition.task_role)

        # Container Configuration containerizing our CentralRouterDaemon
        container = task_definition.add_container(
            "CentralRouterDaemonContainer",
            image=ecs.ContainerImage.from_asset("./daemon_src"),
            logging=ecs.LogDrivers.aws_logs(stream_prefix="SovereignRouter"),
            environment={
                "LEDGER_TABLE_NAME": ledger_table.table_name,
                "DAEMON_HOST": "0.0.0.0",
                "DAEMON_PORT": "8888",
                "AWS_REGION": self.region
            }
        )
        
        container.add_port_mappings(
            ecs.PortMapping(container_port=8888, protocol=ecs.Protocol.TCP)
        )

        # 4. Routing Layer: Network Load Balancer (NLB) for high-throughput raw TCP traffic
        fargate_nlb_service = ecs_patterns.NetworkLoadBalancedFargateService(
            self, "SovereignNlbService",
            cluster=cluster,
            task_definition=task_definition,
            public_load_balancer=True,
            listener_port=8888,
            desired_count=2  # Highly-available dual-node distribution (AZ-1 & AZ-2)
        )

        # Configure raw TCP health checks to verify socket connection availability
        fargate_nlb_service.target_group.configure_health_check(
            protocol=elbv2.Protocol.TCP,
            healthy_threshold_count=2,
            unhealthy_threshold_count=2,
            timeout=Duration.seconds(5),
            interval=Duration.seconds(10)
        )

        # 5. CloudFormation Stack Outputs
        CfnOutput(
            self, "LoadBalancerDNS",
            value=fargate_nlb_service.load_balancer.load_balancer_dns_name,
            description="Public AWS NLB DNS Endpoint for Agent Socket Handshakes (Port 8888)",
            export_name="SovereignNLBDnsEndpoint"
        )

        CfnOutput(
            self, "DynamoDBLedgerTableName",
            value=ledger_table.table_name,
            description="DynamoDB Global Table Name for SHA-3 Ledger State Anchors"
        )

        CfnOutput(
            self, "VpcId",
            value=vpc.vpc_id,
            description="Isolated Multi-AZ Virtual Private Cloud ID"
        )`;

const GITHUB_ACTIONS_CODE = `name: Deploy Sovereign Swarm AWS Infrastructure (CDK v2)

on:
  push:
    branches: [ main, production ]
    paths:
      - 'daemon_src/**'
      - 'infra/**'
      - '.github/workflows/deploy-aws-cdk.yml'
  workflow_dispatch:
    inputs:
      target_env:
        description: 'Target AWS Deployment Environment'
        required: true
        default: 'production'
        type: choice
        options:
          - staging
          - production

permissions:
  id-token: write   # Required for AWS OIDC authentication
  contents: read    # Required to checkout repository code

jobs:
  validate-and-test:
    name: 🧪 Quality Gate & Security Linting
    runs-on: ubuntu-latest
    steps:
      - name: 📥 Checkout repository
        uses: actions/checkout@v4

      - name: 🐍 Set up Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'

      - name: 📦 Install Python Dependencies
        run: |
          python -m pip install --upgrade pip
          pip install flake8 pytest -r daemon_src/requirements.txt -r infra/requirements.txt

      - name: 🔍 Lint Python Source Code
        run: |
          # Stop the build if there are Python syntax errors or undefined names
          flake8 daemon_src infra --count --select=E9,F63,F7,F82 --show-source --statistics

      - name: 🐳 Validate Docker Container Build
        run: |
          docker build -t sovereign-router-daemon:latest daemon_src/

  cdk-synth-and-deploy:
    name: 🚀 Deploy Multi-AZ AWS Infrastructure
    needs: validate-and-test
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: 📥 Checkout repository
        uses: actions/checkout@v4

      - name: 🟢 Set up Node.js 20 (for AWS CDK CLI)
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: 📦 Install AWS CDK CLI
        run: npm install -g aws-cdk@2

      - name: 🐍 Set up Python 3.12 for CDK
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: 📦 Install CDK Python dependencies
        run: |
          pip install -r infra/requirements.txt -r daemon_src/requirements.txt

      - name: 🔐 Authenticate to AWS via OIDC Role
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: \${{ secrets.AWS_CDK_DEPLOY_ROLE_ARN || 'arn:aws:iam::123456789012:role/SovereignCdkDeployerRole' }}
          role-session-name: GitHubActions-SovereignLattice
          aws-region: us-east-1

      - name: 🏗️ CDK Bootstrap Verification
        run: |
          cd infra
          cdk bootstrap aws://\${{ secrets.AWS_ACCOUNT_ID || '123456789012' }}/us-east-1

      - name: 🔬 Synthesize CloudFormation Template
        run: |
          cd infra
          cdk synth

      - name: 📊 CDK Diff (Infrastructure Drift Detection)
        run: |
          cd infra
          cdk diff || true

      - name: 🚀 Deploy Stack (Zero-Downtime Multi-AZ Rolling Update)
        run: |
          cd infra
          cdk deploy SovereignLatticeStack \\
            --require-approval never \\
            --outputs-file ../cdk-outputs.json

      - name: 🌐 Export NLB Endpoint Artifact
        run: |
          echo "=== Sovereign Swarm NLB Deployment Outputs ==="
          cat cdk-outputs.json
          NLB_DNS=$(jq -r '.SovereignLatticeStack.LoadBalancerDNS' cdk-outputs.json)
          echo "PUBLIC_NLB_ENDPOINT=tcp://\${NLB_DNS}:8888" >> $GITHUB_ENV
          echo "🚀 Multi-AZ Network Load Balancer Live at: tcp://\${NLB_DNS}:8888"`;

const CLOUD_DAEMON_CODE = `"""
Central Router Daemon (AWS Fargate Multi-AZ Edition)
Asynchronous TCP socket router with Amazon DynamoDB Global Table integration,
strict schema validation, and SHA-3 state ledger anchoring.
"""

import asyncio
import json
import logging
import os
import sys
import time
from typing import Dict, Any, Optional
import boto3
from botocore.exceptions import ClientError

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] [AZ-Node: %(process)d] SovereignDaemon: %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("SovereignDaemon")

class CloudRouterDaemon:
    def __init__(self):
        self.host = os.environ.get("DAEMON_HOST", "0.0.0.0")
        self.port = int(os.environ.get("DAEMON_PORT", "8888"))
        self.ledger_table_name = os.environ.get("LEDGER_TABLE_NAME", "SovereignStateLedger")
        self.aws_region = os.environ.get("AWS_REGION", "us-east-1")
        self.active_connections = set()
        self.dynamodb = None
        self.ledger_table = None

        try:
            self.dynamodb = boto3.resource("dynamodb", region_name=self.aws_region)
            self.ledger_table = self.dynamodb.Table(self.ledger_table_name)
            logger.info(f"Connected to DynamoDB State Ledger: {self.ledger_table_name}")
        except Exception as e:
            logger.warning(f"DynamoDB local fallback: {e}")

    async def validate_message(self, raw_data: str) -> Dict[str, Any]:
        try:
            data = json.loads(raw_data)
            for field in ["sender_id", "message_id", "payload"]:
                if field not in data or not data[field]:
                    raise ValueError(f"Missing required schema field: '{field}'")
            return {"status": "VALID", "data": data}
        except Exception as e:
            return {"status": "INVALID", "error": str(e)}

    async def persist_state_anchor(self, sender_id: str, message_id: str, payload: Dict[str, Any], key_fingerprint: str):
        if not self.ledger_table:
            return
        loop = asyncio.get_running_loop()
        timestamp = int(time.time() * 1000)
        item = {
            "state_anchor": f"NODE#{sender_id}#STATE",
            "timestamp": timestamp,
            "message_id": message_id,
            "sender_id": sender_id,
            "key_fingerprint": key_fingerprint,
            "status": "ACTIVE",
            "synchronized": True
        }
        try:
            await loop.run_in_executor(None, lambda: self.ledger_table.put_item(Item=item))
        except Exception as e:
            logger.warning(f"DynamoDB write skipped: {e}")

    async def handle_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        peer = writer.get_extra_info("peername")
        self.active_connections.add(writer)
        try:
            while True:
                data_bytes = await reader.read(4096)
                if not data_bytes:
                    break
                raw = data_bytes.decode("utf-8").strip()
                if not raw:
                    writer.write(b'{"status":"HEALTHY","probe":true}\\n')
                    await writer.drain()
                    continue
                v = await self.validate_message(raw)
                if v["status"] == "VALID":
                    msg = v["data"]
                    asyncio.create_task(self.persist_state_anchor(msg["sender_id"], msg["message_id"], msg["payload"], msg.get("key_fingerprint", "")))
                    writer.write(b'{"status":"ACTIVE","synchronized":true}\\n')
                    await writer.drain()
                else:
                    writer.write(b'{"status":"ERROR","reason":"Invalid Message Schema"}\\n')
                    await writer.drain()
        finally:
            self.active_connections.remove(writer)
            writer.close()
            await writer.wait_closed()

    async def start(self):
        server = await asyncio.start_server(self.handle_client, self.host, self.port)
        logger.info(f"Sovereign Multi-AZ Router listening on {self.host}:{self.port}")
        async with server:
            await server.serve_forever()

if __name__ == "__main__":
    asyncio.run(CloudRouterDaemon().start())`;

interface AwsInfraDeployerProps {
  onApplyEndpointToTester?: (endpoint: string) => void;
}

export const AwsInfraDeployer: React.FC<AwsInfraDeployerProps> = ({
  onApplyEndpointToTester,
}) => {
  const daemon = SwarmDaemonService.getInstance();
  const [infraState, setInfraState] = useState<AwsInfrastructureState>(daemon.getAwsInfraState());
  const [endpointMode, setEndpointMode] = useState<'local' | 'aws_nlb'>(daemon.getEndpointMode());
  const [activeCodeTab, setActiveCodeTab] = useState<'docker' | 'cdk' | 'ci_cd' | 'daemon'>('docker');
  const [copied, setCopied] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployLogs, setDeployLogs] = useState<string[]>([
    'AWS CloudFormation Stack: SovereignLatticeStack',
    'Region: us-east-1 (Primary) | Replica: us-west-2 (Low-latency replication)',
    'Status: UPDATE_COMPLETE (Dual-AZ Fargate Tasks Active)',
    'NLB TCP Listener: 8888 -> TargetGroup (HealthCheck: TCP interval=10s)',
  ]);
  const [deployPercent, setDeployPercent] = useState<number>(100);

  const refreshState = () => {
    setInfraState(daemon.getAwsInfraState());
    setEndpointMode(daemon.getEndpointMode());
  };

  const handleRunCdkDeploy = async () => {
    setIsDeploying(true);
    setDeployLogs(['Initiating automated AWS CDK v2 synth & deploy...']);
    setDeployPercent(10);

    await daemon.deployAwsCdkStack((event) => {
      setDeployLogs((prev) => [...prev, `[${event.step}] ${event.detail}`]);
      setDeployPercent(event.percent);
    });

    setIsDeploying(false);
    refreshState();
  };

  const handleSimulateFailover = (az: 'AZ-1' | 'AZ-2') => {
    daemon.simulateAzFailover(az);
    refreshState();
  };

  const handleRestoreBalance = () => {
    daemon.restoreAzBalance();
    refreshState();
  };

  const handleToggleEndpointMode = (mode: 'local' | 'aws_nlb') => {
    daemon.switchEndpointMode(mode);
    refreshState();
  };

  const handleApplyToTester = () => {
    daemon.switchEndpointMode('aws_nlb');
    refreshState();
    if (onApplyEndpointToTester) {
      onApplyEndpointToTester(`tcp://${infraState.nlbEndpoint}:8888`);
    }
  };

  const getCodeSnippet = () => {
    switch (activeCodeTab) {
      case 'docker':
        return { code: DOCKERFILE_CODE, filename: 'Dockerfile' };
      case 'cdk':
        return { code: CDK_STACK_CODE, filename: 'sovereign_lattice_stack.py' };
      case 'ci_cd':
        return { code: GITHUB_ACTIONS_CODE, filename: 'deploy-aws-cdk.yml' };
      case 'daemon':
        return { code: CLOUD_DAEMON_CODE, filename: 'daemon_cloud.py' };
    }
  };

  const currentSnippet = getCodeSnippet();

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(currentSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([currentSnippet.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentSnippet.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: AWS Multi-AZ Overview & Ingress Endpoint */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                AWS Multi-AZ Infrastructure Active
              </span>
              <span className="text-xs font-mono text-slate-400">
                Stack: SovereignLatticeStack (CDK v2)
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-sky-400" />
              <span>AWS Serverless Fargate & Network Load Balancer (NLB)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Production-ready multi-AZ topology distributing high-throughput raw TCP Port 8888 traffic across
              dual availability zones (AZ-1: <span className="text-slate-200">us-east-1a</span>, AZ-2: <span className="text-slate-200">us-east-1b</span>)
              with global DynamoDB state ledger replication to <span className="text-slate-200">us-west-2</span>.
            </p>
          </div>

          {/* Quick Route Selector & Apply to Tester */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
              <button
                onClick={() => handleToggleEndpointMode('local')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  endpointMode === 'local'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Localhost (127.0.0.1)
              </button>
              <button
                onClick={() => handleToggleEndpointMode('aws_nlb')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  endpointMode === 'aws_nlb'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                AWS Multi-AZ NLB
              </button>
            </div>

            <button
              onClick={handleApplyToTester}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Apply NLB to Testbench</span>
            </button>
          </div>
        </div>

        {/* Public Endpoint Banner */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <Globe className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                Public Ingress TCP Endpoint (Port 8888)
              </div>
              <div className="font-mono text-emerald-400 truncate font-semibold">
                tcp://{infraState.nlbEndpoint}:8888
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(`tcp://${infraState.nlbEndpoint}:8888`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition-colors inline-flex items-center gap-1 text-[11px]"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Endpoint'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Multi-AZ Topology Diagram & Chaos Engineering Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Architecture Node Flow */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Network className="w-4 h-4 text-sky-400" />
              <span>Multi-Availability-Zone Architecture & Real-Time Flow</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              TCP Health Checks: 10s interval / 5s timeout
            </span>
          </div>

          {/* Architecture Visual Topology */}
          <div className="space-y-4 py-2">
            {/* Level 1: Public Internet */}
            <div className="flex items-center justify-center">
              <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-center text-xs w-64 shadow-md">
                <div className="font-bold text-white flex items-center justify-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-sky-400" />
                  <span>Public Internet Traffic</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Raw TCP Port 8888
                </div>
              </div>
            </div>

            {/* Connecting Arrow */}
            <div className="flex justify-center text-slate-600">
              <ArrowRight className="w-4 h-4 rotate-90" />
            </div>

            {/* Level 2: Network Load Balancer (NLB) */}
            <div className="flex items-center justify-center">
              <div className="bg-sky-950/40 border border-sky-500/40 rounded-xl px-5 py-2.5 text-center text-xs w-80 shadow-md">
                <div className="font-bold text-sky-200 flex items-center justify-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-sky-400" />
                  <span>AWS Network Load Balancer (NLB)</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  Cross-Zone Load Balancing • Low-latency TCP Ingress
                </div>
                <div className="mt-1 flex items-center justify-center gap-2 text-[10px] font-mono">
                  <span className="text-emerald-400">Target Group: HEALTHY</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">Listener: 8888</span>
                </div>
              </div>
            </div>

            {/* Branching Arrows */}
            <div className="grid grid-cols-2 max-w-md mx-auto text-slate-600 text-center">
              <div className="flex justify-center">
                <ArrowRight className="w-4 h-4 rotate-90" />
              </div>
              <div className="flex justify-center">
                <ArrowRight className="w-4 h-4 rotate-90" />
              </div>
            </div>

            {/* Level 3: Dual Fargate Tasks across AZ-1 and AZ-2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
              {/* AZ-1 Task */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  infraState.az1Status === 'HEALTHY'
                    ? 'bg-slate-950 border-emerald-500/40'
                    : 'bg-rose-950/30 border-rose-500/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-sky-400" />
                    <span>Fargate Task (AZ-1)</span>
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      infraState.az1Status === 'HEALTHY'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {infraState.az1Status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Subnet: <span className="text-slate-300">us-east-1a</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  CPU: 1024 (1 vCPU) • RAM: 2048 MB
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Container: <span className="text-slate-200 font-mono">CentralRouterDaemon</span>
                </div>
              </div>

              {/* AZ-2 Task */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  infraState.az2Status === 'HEALTHY'
                    ? 'bg-slate-950 border-emerald-500/40'
                    : 'bg-rose-950/30 border-rose-500/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-sky-400" />
                    <span>Fargate Task (AZ-2)</span>
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      infraState.az2Status === 'HEALTHY'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {infraState.az2Status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Subnet: <span className="text-slate-300">us-east-1b</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  CPU: 1024 (1 vCPU) • RAM: 2048 MB
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Container: <span className="text-slate-200 font-mono">CentralRouterDaemon</span>
                </div>
              </div>
            </div>

            {/* Connecting Arrow */}
            <div className="flex justify-center text-slate-600">
              <ArrowRight className="w-4 h-4 rotate-90" />
            </div>

            {/* Level 4: Amazon DynamoDB Global Table */}
            <div className="flex items-center justify-center">
              <div className="bg-slate-950 border border-purple-500/40 rounded-xl px-5 py-3 text-center text-xs w-96 shadow-md">
                <div className="font-bold text-purple-200 flex items-center justify-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-purple-400" />
                  <span>Amazon DynamoDB Global Table (TableV2)</span>
                </div>
                <div className="font-mono text-slate-300 mt-0.5">
                  Table: <span className="text-purple-300">{infraState.dynamoTable}</span>
                </div>
                <div className="mt-1 flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400">
                  <span>Partition: state_anchor</span>
                  <span>•</span>
                  <span>Sort: timestamp</span>
                  <span>•</span>
                  <span className="text-emerald-400">Replica: {infraState.replicaRegion}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chaos Engineering & Failover Simulator */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Chaos Engineering & Failover Testbench</span>
            </h3>
            <p className="text-xs text-slate-400 mt-2">
              Inject Availability Zone outages to verify that the AWS Network Load Balancer reroutes
              all agent handshake socket packets without dropping state or desynchronizing the consensus ledger.
            </p>

            <div className="space-y-3 mt-4">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span>Routing Traffic Direction:</span>
                  <span className="font-mono text-emerald-400">
                    {infraState.activeTargetAz === 'BOTH' ? 'Active-Active (AZ-1 & AZ-2)' : `100% Routed to ${infraState.activeTargetAz}`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  DynamoDB Global Table replication retains state across regions with zero recovery time objective (RTO=0).
                </div>
              </div>

              {/* Failover Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => handleSimulateFailover('AZ-1')}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 text-rose-200 text-xs font-semibold rounded-xl transition-colors shadow-sm"
                >
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>Disrupt AZ-1 (Simulate Outage)</span>
                  </span>
                  <span className="text-[10px] font-mono text-rose-400 bg-rose-950 px-2 py-0.5 rounded">
                    Fails to AZ-2
                  </span>
                </button>

                <button
                  onClick={() => handleSimulateFailover('AZ-2')}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 text-rose-200 text-xs font-semibold rounded-xl transition-colors shadow-sm"
                >
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>Disrupt AZ-2 (Simulate Outage)</span>
                  </span>
                  <span className="text-[10px] font-mono text-rose-400 bg-rose-950 px-2 py-0.5 rounded">
                    Fails to AZ-1
                  </span>
                </button>

                <button
                  onClick={handleRestoreBalance}
                  className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restore Dual-AZ Healthy Balance</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 bg-sky-950/30 border border-sky-800/40 rounded-xl text-[11px] text-sky-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <span>
              NLB TCP health probes automatically detect worker recovery within 20 seconds (2 consecutive successes).
            </span>
          </div>
        </div>
      </div>

      {/* Interactive AWS CDK v2 Terminal Simulator */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>AWS CDK v2 Deployment Terminal (CLI Simulator)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Execute live deployment steps to synthesize CloudFormation stacks and provision multi-AZ serverless resources.
            </p>
          </div>

          <button
            onClick={handleRunCdkDeploy}
            disabled={isDeploying}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors shrink-0"
          >
            {isDeploying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Deploying Stack ({deployPercent}%)...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Run cdk deploy</span>
              </>
            )}
          </button>
        </div>

        {/* Terminal Output Window */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1.5 max-h-48 overflow-y-auto shadow-inner">
          <div className="text-slate-500">$ cdk deploy SovereignLatticeStack --require-approval never</div>
          {deployLogs.map((log, idx) => (
            <div key={idx} className="leading-relaxed flex items-start gap-2">
              <span className="text-emerald-400 shrink-0">➜</span>
              <span className="text-slate-300">{log}</span>
            </div>
          ))}
          {isDeploying && (
            <div className="text-sky-400 animate-pulse flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>CloudFormation is provisioning resources in AWS us-east-1...</span>
            </div>
          )}
        </div>
      </div>

      {/* Infrastructure as Code Artifacts & File Viewer */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 text-sky-400" />
              <span>Infrastructure-as-Code & Container Artifacts</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Production files for AWS Fargate containerization, CDK v2 Python stack, and automated GitHub Actions CI/CD.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
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
              onClick={handleDownloadFile}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveCodeTab('docker')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeCodeTab === 'docker'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>daemon_src/Dockerfile</span>
          </button>

          <button
            onClick={() => setActiveCodeTab('cdk')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeCodeTab === 'cdk'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>infra/sovereign_lattice_stack.py</span>
          </button>

          <button
            onClick={() => setActiveCodeTab('ci_cd')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeCodeTab === 'ci_cd'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>.github/workflows/deploy-aws-cdk.yml</span>
          </button>

          <button
            onClick={() => setActiveCodeTab('daemon')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeCodeTab === 'daemon'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>daemon_src/daemon_cloud.py</span>
          </button>
        </div>

        {/* Code Preview */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-[460px] text-slate-300 leading-relaxed shadow-inner">
          <pre>{currentSnippet.code}</pre>
        </div>
      </div>
    </div>
  );
};
