import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import type { Stack } from 'aws-cdk-lib';

export function createS3Bucket(stack: Stack) {
    return new s3.Bucket(stack, 'emoti-static-s3', {
        publicReadAccess: false,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        blockPublicAccess: new s3.BlockPublicAccess({
            blockPublicAcls: false,
            blockPublicPolicy: false,
            ignorePublicAcls: false,
            restrictPublicBuckets: false,
        }),
        accessControl: s3.BucketAccessControl.PRIVATE,
    });
}