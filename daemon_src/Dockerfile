# ==============================================================================
# Sovereign Swarm Orchestrator - Production Container Specification
# Multi-stage, minimal attack surface, non-root execution for AWS ECS Fargate
# ==============================================================================

# --- Stage 1: Build & Dependencies ---
FROM python:3.12-slim AS builder

WORKDIR /build

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# --- Stage 2: Runtime Production Image ---
FROM python:3.12-slim AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DAEMON_HOST=0.0.0.0 \
    DAEMON_PORT=8888 \
    PYTHONPATH=/app

# Create unprivileged system user and group
RUN groupadd -g 10001 sovereign && \
    useradd -u 10001 -g sovereign -s /bin/bash -m sovereign && \
    apt-get update && apt-get install -y --no-install-recommends \
    curl \
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
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); s.settimeout(2); s.connect(('127.0.0.1', 8888)); s.close()" || exit 1

# Execute asynchronous router daemon
ENTRYPOINT ["python", "-u", "/app/daemon_cloud.py"]
