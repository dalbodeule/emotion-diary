import { EC2Client, DescribeSpotFleetInstancesCommand, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { Route53Client, ChangeResourceRecordSetsCommand } from "@aws-sdk/client-route-53";

const ec2 = new EC2Client();
const route53 = new Route53Client();

export const handler = async (event) => {
    const hostedZoneId = process.env.HOSTED_ZONE_ID;
    const recordName = process.env.RECORD_NAME;
    const spotFleetId = process.env.SPOT_FLEET_ID;

    try {
        // Spot Fleet 인스턴스 정보 가져오기
        const fleetData = await ec2.send(new DescribeSpotFleetInstancesCommand({ SpotFleetRequestId: spotFleetId }));
        const instances = fleetData.ActiveInstances;

        if (instances && instances.length > 0) {
            const instanceId = instances[0].InstanceId;

            // 인스턴스의 퍼블릭 IP 주소 가져오기
            const instanceData = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }));
            const publicIp = instanceData.Reservations[0].Instances[0].PublicIpAddress;

            if (!publicIp) {
                return {
                    statusCode: 404,
                    body: JSON.stringify('퍼블릭 IP가 할당되지 않은 인스턴스입니다.'),
                };
            }

            // Route 53 A 레코드 업데이트
            const route53Params = {
                ChangeBatch: {
                    Changes: [{
                        Action: 'UPSERT',
                        ResourceRecordSet: {
                            Name: recordName,
                            Type: 'A',
                            TTL: 300,
                            ResourceRecords: [{ Value: publicIp }],
                        },
                    }],
                },
                HostedZoneId: hostedZoneId,
            };

            await route53.send(new ChangeResourceRecordSetsCommand(route53Params));
            return {
                statusCode: 200,
                body: JSON.stringify('IP가 성공적으로 업데이트되었습니다.'),
            };
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify('활성 스팟 인스턴스가 없습니다.'),
            };
        }
    } catch (error) {
        console.error('오류 발생:', error);
        return {
            statusCode: 500,
            body: JSON.stringify('IP 업데이트에 실패했습니다.'),
        };
    }
};
