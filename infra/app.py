#!/usr/bin/env python3
import os
import aws_cdk as cdk
from sovereign_lattice_stack import SovereignLatticeStack

app = cdk.App()

SovereignLatticeStack(
    app, "SovereignLatticeStack",
    env=cdk.Environment(
        account=os.getenv("CDK_DEFAULT_ACCOUNT", "123456789012"),
        region=os.getenv("CDK_DEFAULT_REGION", "us-east-1")
    ),
    description="Sovereign Swarm Orchestrator Multi-AZ Fargate & NLB Infrastructure"
)

app.synth()
