"""
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
        )
