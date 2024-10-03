import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Peer, Port, SecurityGroup, SubnetType } from "aws-cdk-lib/aws-ec2";
import { ClusterInstance } from "aws-cdk-lib/aws-rds";

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Route 53 호스팅 영역 찾기
    const zone = route53.HostedZone.fromLookup(this, 'HostedZone', { domainName: 'em0ti.ink' });

    // 도메인 인증서 생성
    const certificate = certificatemanager.Certificate.fromCertificateArn(this, 'ImportedCertificate', "arn:aws:acm:us-east-1:324488883689:certificate/7c89c433-a720-4cb6-9378-ae70b20f5dfb");

    // VPC 생성 (기본 구성 또는 기존 VPC 참조)
    const vpc = new ec2.Vpc(this, 'em0ti-vpc', {
      maxAzs: 4, // 가용 영역 수
      cidr: "10.20.0.0/16",
      natGateways: 1,
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
        version: rds.AuroraPostgresEngineVersion.VER_15_7, // PostgreSQL 버전 선택
      }),
      // capacity applies to all serverless instances in the cluster
      serverlessV2MaxCapacity: 4,
      serverlessV2MinCapacity: 0.5,
      writer: ClusterInstance.serverlessV2('writer', {
        publiclyAccessible: true
      }),
      readers: [
        // puts it in promition tier 0-1
        ClusterInstance.serverlessV2('reader1', { scaleWithWriter: true }),
      ],
      port: 5432, // PostgreSQL 포트
      securityGroups: [dbSecurityGroup], // 보안 그룹 설정
      vpc: vpc,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC, // 프라이빗 서브넷에 배치
      },
      enableDataApi: true, // Data API 사용 (필요한 경우)
      defaultDatabaseName: 'emoti', // 기본 데이터베이스 이름
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
    });

    // API Gateway 생성
    const api = new apigateway.LambdaRestApi(this, 'emoti-gateway', {
      handler: nuxtLambda,
      proxy: true,
      deployOptions: {
        stageName: 'prod', // 스테이지 설정
      },
    });

    // S3 버킷 생성 (정적 자산)
    const bucket = new s3.Bucket(this, 'emoti-static-s3', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true, // 퍼블릭 읽기 허용
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 개발 시 버킷 제거 허용
      autoDeleteObjects: true, // 버킷 제거 시 객체 자동 삭제
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS, // 퍼블릭 액세스 설정 (ACL만 차단)
    });

    // 정적 파일 S3로 배포
    new s3Deployment.BucketDeployment(this, 'DeployStaticFiles', {
      sources: [s3Deployment.Source.asset(path.join(__dirname, '../../.output/public'))],
      destinationBucket: bucket,
    });

    const apiDomainName = cdk.Fn.select(2, cdk.Fn.split('/', api.url));
    // CloudFront 배포 생성
    const distribution = new cloudfront.Distribution(this, 'emoti-cdn', {
      defaultBehavior: {
        origin: new origins.HttpOrigin(apiDomainName, {
          originPath: '/prod'
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        // Nuxt 정적 자산 경로는 S3에서 제공
        '/_nuxt/*': {
          origin: new origins.S3Origin(bucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        '/static/*': {
          origin: new origins.S3Origin(bucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
      domainNames: ['em0ti.ink', 'www.em0ti.ink'],
      certificate,
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
