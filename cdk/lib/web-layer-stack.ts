import * as cdk from 'aws-cdk-lib';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3Deployment from 'aws-cdk-lib/aws-s3-deployment'
import { createRoute53Record } from './route53';
import type { Construct } from 'constructs';
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import {AccessLevel, AllowedMethods, HttpVersion, SigningBehavior, SigningProtocol} from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as path from "path"
import {DockerImage, Duration, Fn} from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2"
import * as apigatewayv2_integrations from "aws-cdk-lib/aws-apigatewayv2-integrations"
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export class WebLayerStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const certificate = certificatemanager.Certificate.fromCertificateArn(
            this,
            'ImportedCertificate',
            "arn:aws:acm:us-east-1:324488883689:certificate/7c89c433-a720-4cb6-9378-ae70b20f5dfb"
        );

        // VPC ID 가져오기
        const vpcId = Fn.importValue('VpcIdOutput');
        const privateSubnets = Fn.importListValue('PrivateSubnetsOutput', 2, ',')
        const publicSubnets = Fn.importListValue('PublicSubnetsOutput', 2, ',')
        const azs = Fn.importListValue('SubnetAZS', 2, ',')

        const bucketName = Fn.importValue('S3BucketOutput');
        const hostedZoneDomain = Fn.importValue('HostedZoneDomainOutput');
        const hostedZoneId = Fn.importValue('HostedZoneOutput');

        const dbCluster = Fn.importValue('RDSClusterArn')
        const secretArn = Fn.importValue('RDSSecretArn')

        const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
            zoneName: hostedZoneDomain,
            hostedZoneId: hostedZoneId,
        });

        // 이 값들을 사용하여 리소스를 생성합니다.
        const importedVpc = ec2.Vpc.fromVpcAttributes(this, 'ImportedVpc', {
            vpcId: vpcId,
            availabilityZones: azs, // 사용할 가용 영역 설정
            publicSubnetIds: publicSubnets,
            privateSubnetIds: privateSubnets,
        });

        const bucket = s3.Bucket.fromBucketName(this, 'ImportedBucket', bucketName);

        // 정적 파일 S3로 배포
        new s3Deployment.BucketDeployment(this, 'DeployStaticFiles', {
            sources: [s3Deployment.Source.asset(path.join(__dirname, '../../.output/public'))],
            destinationBucket: bucket,
            destinationKeyPrefix: 'static/'
        });

        // SageMaker 엔드포인트 URL을 가져오기 위해 importValue 사용
        const bertEndpoint = Fn.importValue('SageMakerBERTModelEndpointName');

        // Lambda에 사용될 IAM 역할 생성 또는 기존 역할 가져오기
        const lambdaRole = new iam.Role(this, 'LambdaRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        });

        const emotionLambdaRole = new iam.Role(this, 'EmotionLambdaRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        })

        // Secrets Manager에 대한 권한 추가
        lambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: ['secretsmanager:GetSecretValue'],
            resources: [secretArn],
        }));
        emotionLambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: ['secretsmanager:GetSecretValue'],
            resources: [secretArn],
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
            resources: [dbCluster],
        }));
        emotionLambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                'rds-data:ExecuteStatement',
                'rds-data:BatchExecuteStatement',
                'rds-data:BeginTransaction',
                'rds-data:CommitTransaction',
                'rds-data:RollbackTransaction',
            ],
            resources: [dbCluster],
        }));

        lambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                'ec2:CreateNetworkInterface',
                'ec2:DescribeNetworkInterfaces',
                'ec2:DeleteNetworkInterface',
            ],
            resources: ['*'], // 네트워크 인터페이스는 특정 리소스가 아니므로 "*"로 설정
        }));
        emotionLambdaRole.addToPolicy(new iam.PolicyStatement({
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
        emotionLambdaRole.addToPolicy(new iam.PolicyStatement({
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


        emotionLambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: ['sagemaker:InvokeEndpoint'],
            resources: [`arn:aws:sagemaker:${this.region}:${this.account}:endpoint/${bertEndpoint}`], // 대체
        }));

        // CloudWatch 로그 그룹 생성
        const logGroup = new logs.LogGroup(this, 'EmotiLambdaLogGroup', {
            logGroupName: '/aws/lambda/emoti-lambda',
            removalPolicy: cdk.RemovalPolicy.DESTROY, // 스택 삭제 시 로그 그룹도 삭제
            retention: logs.RetentionDays.ONE_WEEK, // 로그 보존 기간 설정
        });

        // Lambda Layer 생성
        const lambdaLayer = new lambda.LayerVersion(this, 'MyLambdaLayer', {
            code: lambda.Code.fromAsset(path.join(__dirname, '../../.output/server'), {
                bundling: {
                    image: DockerImage.fromRegistry('node:20-bullseye'),
                    command: [
                        'bash', '-c',
                        [
                            'npm install --global node-pre-gyp',  // root 권한으로 global 설치
                            'su node -c "rm -rf node_modules"',
                            'su node -c "npm install"', // node 사용자로 package 설치
                            'su node -c "npm rebuild bcrypt --build-from-source"',  // 아키텍처에 맞춰 bcrypt 재빌드
                            'su node -c "find node_modules -type f -name \\"*.md\\" -delete"',  // 불필요한 .md 파일 삭제
                            'su node -c "find node_modules -type f -name \\"*.d.ts\\" -delete"',  // TypeScript 타입 정의 삭제
                            'su node -c "find node_modules -type d -name \\"test\\" -exec rm -rf {} +"', // test 폴더 삭제
                            'su node -c "find node_modules -type d -name \\"__tests__\\" -exec rm -rf {} +"',  // __tests__ 폴더 삭제
                            'mkdir -p /asset-output/nodejs',
                            'cp -r node_modules /asset-output/nodejs'  // node_modules만 Layer에 포함
                        ].join(' && ')
                    ],
                    user: 'root'
                },
            }),
            compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
            compatibleArchitectures: [lambda.Architecture.ARM_64],
            description: 'Node.js Lambda Layer with native package dependencies',
        });

        // emotion lambda long job function created
        const emotionLambda = new lambda.Function(this, 'emotion-lambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler', // dist/handler.js의 handler 함수
            memorySize: 256,
            architecture: lambda.Architecture.ARM_64,
            reservedConcurrentExecutions: 2,
            timeout: Duration.minutes(15),
            code: lambda.Code.fromAsset(path.join(__dirname, '../../steps/dist')), // 빌드된 코드 위치
            environment: {
                DB_SECRETS: secretArn,
                EMOTION_ENDPOINT: bertEndpoint,
            },
            role: emotionLambdaRole,
            logGroup: logGroup,
            vpc: importedVpc,
        });

        lambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: [ 'lambda:InvokeFunction' ],
            resources: [ emotionLambda.functionArn ]
        }))

        // Lambda 함수 생성 (예: nuxtLambda)
        const nuxtLambda = new lambda.Function(this, 'emoti-lambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            architecture: lambda.Architecture.ARM_64,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../.output/server')),
            memorySize: 512,
            timeout: cdk.Duration.seconds(30),
            environment: {
                NODE_ENV: 'production',
                NUXT_AWS_DATABASE: 'emoti',
                NUXT_AWS_REGION: this.region,
                NUXT_AWS_RESOURCE_ARN: dbCluster,
                NUXT_AWS_SECRET_ARN: secretArn,
                NUXT_EMOTION_REGION: emotionLambda.env.region,
                NUXT_EMOTION_LAMBDA: emotionLambda.functionName
            },
            role: lambdaRole,
            logGroup: logGroup,
            vpc: importedVpc,
            layers: [lambdaLayer],
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

        const cloudfrontOAC = new cloudfront.S3OriginAccessControl(this, 'CloudFrontOAC', {
            originAccessControlName: "EmotiOAC",
            description: "Origin Access Control for Emoti CloudFront",
            signing: {
                behavior: SigningBehavior.NO_OVERRIDE,
                protocol: SigningProtocol.SIGV4,
            },
        });

        const originRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'OriginRequestPolicy', {
            headerBehavior: cloudfront.OriginRequestHeaderBehavior.denyList('Host'),
            queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
            cookieBehavior: cloudfront.OriginRequestCookieBehavior.all(),
        });

        // CloudFront Distribution 생성
        const distribution = new cloudfront.Distribution(this, 'EmotiCDN', {
            defaultBehavior: {
                origin: new origins.HttpOrigin(`${httpApi.apiId}.execute-api.${this.region}.amazonaws.com`, {
                    originPath: '/', // 필요한 경우 스테이지 이름 추가
                }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, // SSR 응답 캐싱 비활성화
                originRequestPolicy,
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

        // Route 53 레코드 생성
        createRoute53Record(this, zone, distribution);
    }
}