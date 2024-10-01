import { drizzle } from 'drizzle-orm/aws-data-api/pg';
import { RDSDataClient } from '@aws-sdk/client-rds-data';
import { fromIni } from '@aws-sdk/credential-providers';

const config = useRuntimeConfig()
const rdsClient = new RDSDataClient({
    credentials: fromIni({ profile: config.aws.profile }),
    region: 'ap-southeast-2'
})

export function useDrizzle() {
    return drizzle(rdsClient, {
        database: config.aws.database,
        secretArn: config.aws.secretArn,
        resourceArn: config.aws.resourceArn,
    })
}