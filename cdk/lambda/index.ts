const AWS = require('aws-sdk');
const ec2 = new AWS.EC2();

exports.start = async () => {
    const instanceId = process.env.INSTANCE_ID;

    // EC2 인스턴스 시작
    await ec2.startInstances({ InstanceIds: [instanceId] }).promise();
    return `Instance ${instanceId} started`;
};

exports.stop = async () => {
    const instanceId = process.env.INSTANCE_ID;

    // EC2 인스턴스 종료
    await ec2.stopInstances({ InstanceIds: [instanceId] }).promise();
    return `Instance ${instanceId} stopped`;
};