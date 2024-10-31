import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import {Fn} from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3"
import * as iam from "aws-cdk-lib/aws-iam";
import * as sagemaker from "aws-cdk-lib/aws-sagemaker";

export class SageMakerStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const bucketName = Fn.importValue('S3BucketOutput');
        const bucket = s3.Bucket.fromBucketName(this, 'ImportedBucket', bucketName);


        const sageMakerRole = new iam.Role(this, 'SageMakerRole', {
            assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
            inlinePolicies: {
                S3AccessPolicy: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            actions: ['s3:GetObject', 's3:ListBucket'],
                            resources: [
                                bucket.bucketArn,
                                `${bucket.bucketArn}/*`,
                            ],
                        }),
                    ],
                }),
            },
        });

        sageMakerRole.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly')
        );

        const bertModel = new sagemaker.CfnModel(this, 'BERTModel', {
            executionRoleArn: sageMakerRole.roleArn,
            primaryContainer: {
                image: '763104351884.dkr.ecr.ap-northeast-2.amazonaws.com/huggingface-pytorch-inference:' +
                        `2.1.0-transformers4.37.0-cpu-py310-ubuntu22.04`, // Huggingface Transformers 이미지,
                modelDataUrl: `s3://${bucket.bucketName}/model/bert.tar.gz`,
            },
        });

        // SageMaker Serverless Endpoint Configuration
        const bertEndpointConfig = new sagemaker.CfnEndpointConfig(this, 'BERTEndpointConfig', {
            productionVariants: [{
                modelName: bertModel.attrModelName, // 위에서 생성한 모델 이름 사용
                variantName: 'AllTraffic', // 트래픽을 처리할 버전 이름
                serverlessConfig: {
                    memorySizeInMb: 4096, // Serverless 인프라의 메모리 크기 설정
                    maxConcurrency: 5, // 동시에 처리할 수 있는 최대 요청 수
                },
            }],
        });

        bertEndpointConfig.node.addDependency(bertModel);

        // SageMaker Endpoint 생성 (Private Endpoint)
        const bertEndpoint = new sagemaker.CfnEndpoint(this, 'BERTEndpoint', {
            endpointConfigName: bertEndpointConfig.attrEndpointConfigName,
        });

        bertEndpoint.node.addDependency(bertEndpointConfig)

        // CfnOutput으로 엔드포인트 URL을 출력
        new cdk.CfnOutput(this, 'SageMakerBertEndpoint', {
            value: bertEndpoint.attrEndpointName,
            description: 'The name of the SageMaker BERT model endpoint',
            exportName: 'SageMakerBERTModelEndpointName', // 외부에서 가져올 수 있게 export 설정
        });
    }
}