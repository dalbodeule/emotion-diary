import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import type { Stack } from 'aws-cdk-lib';

export function createDatabase(stack: Stack, vpc: ec2.Vpc) {
    const dbSecurityGroup = new ec2.SecurityGroup(stack, 'DbSecurityGroup', {
        vpc: vpc,
        allowAllOutbound: true,
    });

    dbSecurityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(5432),
        'allow inbound traffic from anywhere to the db on port 5432'
    );

    return new rds.DatabaseCluster(stack, 'Cluster', {
        engine: rds.DatabaseClusterEngine.auroraPostgres({
            version: rds.AuroraPostgresEngineVersion.VER_16_3,
        }),
        writer: rds.ClusterInstance.provisioned('writer', {
            publiclyAccessible: false,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
        }),
        port: 5432,
        securityGroups: [dbSecurityGroup],
        vpc: vpc,
        vpcSubnets: {
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        defaultDatabaseName: 'emoti',
        credentials: rds.Credentials.fromGeneratedSecret("postgres", {
            secretName: `rdsCluster-secret`
        }),
    });
}