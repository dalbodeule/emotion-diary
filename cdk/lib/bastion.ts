// lib/bastion.ts
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import type { Stack } from 'aws-cdk-lib';
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import type {IHostedZone} from "aws-cdk-lib/aws-route53";
import { Duration } from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

export function createBastionHost(stack: Stack, vpc: ec2.Vpc, zone: IHostedZone, recordName: string) {
    const spotFleetRole = new iam.Role(stack, 'SpotFleetRole', {
        assumedBy: new iam.ServicePrincipal('spotfleet.amazonaws.com'),
    });

    spotFleetRole.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2SpotFleetTaggingRole')
    );

    const bastionSecurityGroup = new SecurityGroup(stack, 'BastionSecurityGroup', {
        vpc,
        allowAllOutbound: true,
    });

    bastionSecurityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(22),
        "Allow SSH Access from anywhere"
    );

    // Spot Fleet 요청 생성
    const bastionHost = new ec2.CfnSpotFleet(stack, 'SpotFleet', {
        spotFleetRequestConfigData: {
            iamFleetRole: spotFleetRole.roleArn,
            allocationStrategy: 'lowestPrice',
            spotPrice: '0.01',
            targetCapacity: 1,
            launchSpecifications: [
                {
                    instanceType: 't3.nano',
                    imageId: 'ami-040c33c6a51fd5d96', // Ubuntu 24.04의 Amazon Machine Image (AMI) ID를 입력
                    keyName: 'macbook', // SSH 키 페어 이름
                    networkInterfaces: [
                        {
                            subnetId: vpc.publicSubnets[0].subnetId,
                            associatePublicIpAddress: true,
                            deviceIndex: 0,
                            groups: [bastionSecurityGroup.securityGroupId],
                        },
                    ],
                    blockDeviceMappings: [
                        {
                            deviceName: '/dev/sda1',
                            ebs: {
                                volumeSize: 20, // 예: 20 GB
                                volumeType: 'gp2',
                                deleteOnTermination: false, // 인스턴스 종료 시 EBS 보존
                            },
                        },
                    ],
                },
            ],
        },
    });

    // Bastion Host의 IP를 Route 53에 업데이트하는 Lambda 함수 생성
    const updateIpFunction = new lambda.Function(stack, 'UpdateBastionIpFunction', {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler', // index.js 파일의 handler 함수 지정
        code: lambda.Code.fromAsset('./lambda'), // Lambda 함수 코드 경로
        environment: {
            HOSTED_ZONE_ID: zone.hostedZoneId,
            RECORD_NAME: recordName,
            SPOT_FLEET_ID: bastionHost.attrId,
        },
        logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // EC2 권한 추가
    updateIpFunction.addToRolePolicy(new iam.PolicyStatement({
        actions: [
            'ec2:DescribeSpotFleetInstances',
            'ec2:DescribeInstances'
        ],
        resources: ['*'], // 특정 Spot Fleet 요청에만 권한을 주려면 ARN으로 제한할 수 있음
    }));

    // Permissions for Lambda to update Route 53
    updateIpFunction.addToRolePolicy(new iam.PolicyStatement({
        actions: ['route53:ChangeResourceRecordSets'],
        resources: [`arn:aws:route53:::hostedzone/${zone.hostedZoneId}`],
    }));

    // CloudWatch Events rule to trigger Lambda function every 5 minutes
    const rule = new events.Rule(stack, 'UpdateBastionIpRule', {
        schedule: events.Schedule.rate(Duration.minutes(5)),
    });

    rule.addTarget(new targets.LambdaFunction(updateIpFunction));

    return bastionHost;
}