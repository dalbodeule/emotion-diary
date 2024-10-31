import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import type { Stack } from 'aws-cdk-lib';
import type { IHostedZone } from "aws-cdk-lib/aws-route53";
import type * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

export function createRoute53Record(stack: Stack, zone: IHostedZone, distribution: cloudfront.Distribution) {
    new route53.ARecord(stack, 'SiteAliasRecord', {
        zone,
        target: route53.RecordTarget.fromAlias(new route53targets.CloudFrontTarget(distribution)),
    });
}