import * as cdk from 'aws-cdk-lib';
import type {Construct} from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2_integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as s3 from 'aws-cdk-lib/aws-s3';
import {BucketAccessControl} from 'aws-cdk-lib/aws-s3';
import * as s3Deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import {AccessLevel, AllowedMethods, HttpVersion, SigningBehavior, SigningProtocol} from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import {Peer, Port, SecurityGroup, SubnetType} from 'aws-cdk-lib/aws-ec2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as logs from 'aws-cdk-lib/aws-logs';
import {ClusterInstance} from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Route 53 호스팅 영역 찾기
    const zone = route53.HostedZone.fromLookup(this, 'HostedZone', { domainName: 'em0ti.ink' });

    // 도메인 인증서 생성
    const certificate = certificatemanager.Certificate.fromCertificateArn(this, 'ImportedCertificate', "arn:aws:acm:us-east-1:324488883689:certificate/7c89c433-a720-4cb6-9378-ae70b20f5dfb");

    // VPC 생성 (기본 구성 또는 기존 VPC 참조)
    const vpc = new ec2.Vpc(this, 'em0ti-vpc', {
      maxAzs: 2, // 가용 영역 수
      cidr: "10.20.0.0/16",
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC, // NAT 게이트웨이가 배포될 퍼블릭 서브넷
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // Lambda가 연결되는 프라이빗 서브넷
        },
      ],
    });

    // create a security group for aurora db
    const dbSecurityGroup = new SecurityGroup(this, 'DbSecurityGroup', {
      vpc: vpc, // use the vpc created above
      allowAllOutbound: true // allow outbound traffic to anywhere
    });

    // allow inbound traffic from anywhere to the db
    dbSecurityGroup.addIngressRule(
        Peer.anyIpv4(),
        Port.tcp(5432), // allow inbound traffic on port 5432 (postgres)
        'allow inbound traffic from anywhere to the db on port 5432'
    );

    const dbCluster = new rds.DatabaseCluster(this, 'Cluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_3, // PostgreSQL 버전 선택
      }),
      writer: ClusterInstance.provisioned('writer', {
        publiclyAccessible: true,
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM)
      }),
      port: 5432, // PostgreSQL 포트
      securityGroups: [dbSecurityGroup], // 보안 그룹 설정
      vpc: vpc,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC, // 프라이빗 서브넷에 배치
      },
      defaultDatabaseName: 'emoti', // 기본 데이터베이스 이름
      credentials: rds.Credentials.fromGeneratedSecret("postgres", {
        secretName: `rdsCluster-secret`
      })
    })

    // Lambda에 사용될 IAM 역할 생성 또는 기존 역할 가져오기
    const lambdaRole = new iam.Role(this, 'LambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // Secrets Manager에 대한 권한 추가
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: ['secretsmanager:GetSecretValue'],
      resources: [dbCluster.secret?.secretArn ?? ''],
    }));

    // RDS Data API에 필요한 권한 추가
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'rds-data:ExecuteStatement',
        'rds-data:BatchExecuteStatement',
        'rds-data:BeginTransaction',
        'rds-data:CommitTransaction',
        'rds-data:RollbackTransaction',
      ],
      resources: [dbCluster.clusterArn],
    }));

    // Lambda 역할에 필요한 EC2 권한 추가
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'ec2:CreateNetworkInterface',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DeleteNetworkInterface',
      ],
      resources: ['*'], // 네트워크 인터페이스는 특정 리소스가 아니므로 "*"로 설정
    }));

    // CloudWatch Logs 권한 추가
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [
        `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/emoti-lambda:*`
      ],
    }));

    // CloudWatch 로그 그룹 생성
    const logGroup = new logs.LogGroup(this, 'EmotiLambdaLogGroup', {
      logGroupName: '/aws/lambda/emoti-lambda',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 스택 삭제 시 로그 그룹도 삭제
      retention: logs.RetentionDays.ONE_WEEK, // 로그 보존 기간 설정
    });

    // Spot Fleet에 필요한 IAM 역할 생성
    const spotFleetRole = new iam.Role(this, 'SpotFleetRole', {
      assumedBy: new iam.ServicePrincipal('spotfleet.amazonaws.com'),
    });

    // 필요한 IAM 정책을 추가
    spotFleetRole.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2SpotFleetTaggingRole')
    );

    const spotInstanceRole = new iam.Role(this, 'SpotInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });

    const instanceProfile = new iam.CfnInstanceProfile(this, 'InstanceProfile', {
      roles: [spotInstanceRole.roleName],
    });

    // Bastion Host 보안 그룹
    const bastionSecurityGroup = new ec2.SecurityGroup(this, 'BastionSecurityGroup', {
      vpc,
      allowAllOutbound: true,
    });
    bastionSecurityGroup.addIngressRule(
        ec2.Peer.ipv4("211.217.79.151/32"),
        ec2.Port.tcp(22),
        "Allow SSH Access from Local machine"
    )

    // 스팟 인스턴스 요청 생성
    const bastionHost = new ec2.CfnSpotFleet(this, 'SpotFleet', {
      spotFleetRequestConfigData: {
        iamFleetRole: spotFleetRole.roleArn, // 올바른 ARN으로 설정
        allocationStrategy: 'lowestPrice',
        spotPrice: '0.01', // 최대 스팟 인스턴스 가격 (미국 달러 기준)
        targetCapacity: 1, // 필요한 인스턴스의 수
        launchSpecifications: [
          {
            instanceType: 't3.nano', // 인스턴스 유형
            imageId: new ec2.AmazonLinuxImage().getImage(this).imageId, // Amazon Linux 이미지 사용
            keyName: 'macbook', // SSH 키 페어 이름
            networkInterfaces: [
              {
                subnetId: vpc.publicSubnets[0].subnetId,
                associatePublicIpAddress: true,
                deviceIndex: 0,
                groups: [bastionSecurityGroup.securityGroupId]
              },
            ],
            iamInstanceProfile: {
              arn: instanceProfile.attrArn, // 생성한 인스턴스 프로파일의 ARN 사용
            },
          },
        ],
      },
    });

    // Lambda 함수 생성
    const nuxtLambda = new lambda.Function(this, 'emoti-lambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../.output/server')),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: 'production',
        NUXT_AWS_DATABASE: 'emoti',
        NUXT_AWS_REGION: this.region,
        NUXT_AWS_RESOURCE_ARN: dbCluster.clusterArn,
        NUXT_AWS_SECRET_ARN: dbCluster.secret?.secretArn ?? ''
      },
      role: lambdaRole,
      vpc, // VPC에 Lambda 연결
      logGroup: logGroup
    });

    const httpApi = new apigatewayv2.HttpApi(this, 'EmotiHttpApi', {
      apiName: 'EmotiService',
      defaultIntegration: new apigatewayv2_integrations.HttpLambdaIntegration(
          'LambdaIntegration',
          nuxtLambda
      ),
      corsPreflight: {
        allowHeaders: ['*'],
        allowMethods: [apigatewayv2.CorsHttpMethod.ANY],
        allowOrigins: ['*'],
      },
      defaultAuthorizer: undefined,
    });

    nuxtLambda.addPermission('ApiGatewayInvokePermission', {
      action: 'lambda:InvokeFunction',
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: httpApi.arnForExecuteApi(),
    });

    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: new apigatewayv2_integrations.HttpLambdaIntegration(
          'LambdaIntegrationProxy',
          nuxtLambda
      ),
    });

    // CloudFront OAC 생성
    const cloudfrontOAC = new cloudfront.S3OriginAccessControl(this, 'CloudFrontOAC', {
      originAccessControlName: "EmotiOAC",
      description: "Origin Access Control for Emoti CloudFront",
      signing: {
        behavior: SigningBehavior.NO_OVERRIDE,
        protocol: SigningProtocol.SIGV4,
      },
    });

    // S3 버킷 생성 (정적 자산)
    const bucket = new s3.Bucket(this, 'emoti-static-s3', {
      publicReadAccess: false, // 퍼블릭 읽기 비허용
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 개발 시 버킷 제거 허용
      autoDeleteObjects: true, // 버킷 제거 시 객체 자동 삭제
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false
      }),
      accessControl: BucketAccessControl.PRIVATE,
    });

    // 정적 파일 S3로 배포
    new s3Deployment.BucketDeployment(this, 'DeployStaticFiles', {
      sources: [s3Deployment.Source.asset(path.join(__dirname, '../../.output/public'))],
      destinationBucket: bucket,
      destinationKeyPrefix: 'static/'
    });

    const originRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'OriginRequestPolicy', {
      headerBehavior: cloudfront.OriginRequestHeaderBehavior.denyList('Host'),
      queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
      cookieBehavior: cloudfront.OriginRequestCookieBehavior.all(),
    });

    // CloudFront Distribution 생성
    const distribution = new cloudfront.Distribution(this, 'emoti-cdn', {
      defaultBehavior: {
        origin: new origins.HttpOrigin(`${httpApi.apiId}.execute-api.${this.region}.amazonaws.com`, {
          originPath: '/', // 필요한 경우 스테이지 이름 추가
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, // SSR 응답 캐싱 비활성화
        originRequestPolicy: originRequestPolicy,
        allowedMethods: AllowedMethods.ALLOW_ALL
      },
      additionalBehaviors: {
        '/static/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(bucket, {
            originAccessControl: cloudfrontOAC,
            originAccessLevels: [
                AccessLevel.READ,
            ],
          }),
          compress: true,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          originRequestPolicy: originRequestPolicy,
        },
      },
      domainNames: ['em0ti.ink', 'www.em0ti.ink'],
      certificate,
      logBucket: new s3.Bucket(this, 'CloudFrontLogs', {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        encryption: s3.BucketEncryption.S3_MANAGED,

        // ACL 활성화를 위한 설정 추가
        objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
        accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
      }),
      logFilePrefix: 'emoti-cdn-logs/',
      enableLogging: true,
      httpVersion: HttpVersion.HTTP2_AND_3
    });

    // Route 53에 레코드 생성
    new route53.ARecord(this, 'SiteAliasRecord', {
      zone,
      target: route53.RecordTarget.fromAlias(new route53targets.CloudFrontTarget(distribution)),
    });

    // 데이터베이스 엔드포인트 및 인증 정보 출력
    new cdk.CfnOutput(this, 'DbEndpoint', {
      value: dbCluster.clusterEndpoint.hostname,
    });
    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: dbCluster.secret?.secretArn || '',
    });

    // CloudFront URL 출력
    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: distribution.distributionDomainName,
    });
  }
}
