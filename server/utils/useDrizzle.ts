import {drizzle as awsDrizzle} from 'drizzle-orm/aws-data-api/pg'; // AWS Data API용
import {RDSDataClient} from '@aws-sdk/client-rds-data';
import { fromIni } from '@aws-sdk/credential-providers';

import * as schema from "../db/schema"

const config = useRuntimeConfig()

export async function useDrizzle() {
    // 로컬 및 서버 환경 판별을 위한 플래그
    const isLocal = process.env.NODE_ENV === 'development';

    let rdsClient: RDSDataClient

    if (isLocal) {
        // 서버 환경: AWS RDS Data API 사용
        rdsClient = new RDSDataClient({
            credentials: fromIni({ profile: config.aws.profile }),
            region: config.aws.region,
        });
    } else {
        // 서버 환경: AWS RDS Data API 사용
        rdsClient = new RDSDataClient({
            region: config.aws.region,
        });
    }

    return awsDrizzle(rdsClient, {
        database: config.aws.database,
        secretArn: config.aws.secretArn,
        resourceArn: config.aws.resourceArn,
        schema: { ...schema }
    });
}