import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { createDatabase } from './database';
import { createS3Bucket } from './s3';
import {createBastionHost} from "./bastion";
import type * as s3 from 'aws-cdk-lib/aws-s3';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import type * as rds from 'aws-cdk-lib/aws-rds';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as iam from 'aws-cdk-lib/aws-iam';
import type {IHostedZone} from "aws-cdk-lib/aws-route53";

export class InfrastructureStack extends cdk.Stack {
    public readonly bucket: s3.Bucket;
    public readonly vpc: ec2.Vpc;
    public readonly dbCluster: rds.DatabaseCluster;
    public readonly zone: IHostedZone;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // VPC 생성 (public 및 private 서브넷)
        this.vpc = new ec2.Vpc(this, 'MyVpc', {
            maxAzs: 2, // 가용 영역 수 (여기서 2개 지정)
            natGateways: 1, // NAT Gateway 수 (최소 하나)
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'publicSubnet',
                    subnetType: ec2.SubnetType.PUBLIC, // 공용 서브넷
                },
                {
                    cidrMask: 24,
                    name: 'privateSubnet',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // 프라이빗 서브넷
                },
            ],
        });

        // 데이터베이스 생성
        this.dbCluster = createDatabase(this, this.vpc);

        // S3 버킷 생성
        this.bucket = createS3Bucket(this);

        const bucketPolicy = new iam.PolicyStatement({
            actions: ['s3:GetObject'],
            resources: [this.bucket.arnForObjects('*')],
            principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        });

        this.bucket.addToResourcePolicy(bucketPolicy);

        this.zone = route53.HostedZone.fromLookup(this, 'HostedZone', { domainName: 'em0ti.ink' });

        // Bastion Host 생성
        createBastionHost(this, this.vpc, this.zone, 'bastion.em0ti.ink');

        // 출력 추가
        new cdk.CfnOutput(this, 'VpcId', {
            value: this.vpc.vpcId,
            description: 'VPC ID',
            exportName: 'VpcIdOutput' // 다른 스택에서 사용하기 위한 export 이름
        });

        new cdk.CfnOutput(this, 'PublicSubnetIds', {
            value: cdk.Fn.join(',', this.vpc.publicSubnets.map(subnet => subnet.subnetId)),
            description: 'Public Subnet IDs',
            exportName: 'PublicSubnetsOutput' // 다른 스택에서 사용하기 위한 export 이름
        });

        new cdk.CfnOutput(this, 'PrivateSubnetIds', {
            value: cdk.Fn.join(',', this.vpc.privateSubnets.map(subnet => subnet.subnetId)),
            description: 'Private Subnet IDs',
            exportName: 'PrivateSubnetsOutput' // 다른 스택에서 사용하기 위한 export 이름,
        });

        new cdk.CfnOutput(this, 'SubnetAZS', {
            value: cdk.Fn.join(',', this.vpc.availabilityZones),
            description: 'VPCSubnetAZ',
            exportName: 'SubnetAZS'
        })

        new cdk.CfnOutput(this, 'S3BucketName', {
            value: this.bucket.bucketName,
            description: 'S3 Bucket Name',
            exportName: 'S3BucketOutput' // 다른 스택에서 사용하기 위한 export 이름
        });

        // Route 53 호스팅 영역 정보
        new cdk.CfnOutput(this, 'HostedZoneDomain', {
            value: this.zone.zoneName,
            description: 'Route 53 Hosted Zone ID',
            exportName: 'HostedZoneDomainOutput' // 다른 스택에서 사용하기 위한 export 이름
        });
        new cdk.CfnOutput(this, 'HostedZoneId', {
            value: this.zone.hostedZoneId,
            description: 'Route 53 Hosted Zone ID',
            exportName: 'HostedZoneOutput'
        });

        // RDSCluster
        new cdk.CfnOutput(this, 'RDSCluster', {
            value: this.dbCluster.clusterArn,
            description: 'RDS Cluster Arn',
            exportName: 'RDSClusterArn' // 다른 스택에서 사용하기 위한 export 이름
        });
        new cdk.CfnOutput(this, 'RDSSecret', {
            value: this.dbCluster.secret?.secretArn ?? "",
            description: 'RDS Cluster Arn',
            exportName: 'RDSSecretArn' // 다른 스택에서 사용하기 위한 export 이름
        });
    }
}