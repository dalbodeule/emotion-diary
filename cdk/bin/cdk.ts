#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {InfrastructureStack} from "../lib/infrastructure-stack";
import {WebLayerStack} from "../lib/web-layer-stack";
import {SageMakerStack} from "../lib/sagemaker-stack";

const app = new cdk.App();
const props: cdk.StackProps = {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION
    }
}
const commonName = 'em0ti'

const infraStack = new InfrastructureStack(app, `${commonName}-InfrastructureStack`, props);
const sageMakerStack = new SageMakerStack(app, `${commonName}-SageMakerStack`, props);
const webLayerStack = new WebLayerStack(app, `${commonName}-WebLayerStack`, props);

// 스택 간 의존성 설정
sageMakerStack.addDependency(infraStack);
webLayerStack.addDependency(infraStack);
webLayerStack.addDependency(sageMakerStack);

