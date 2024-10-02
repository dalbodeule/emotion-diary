import { drizzle } from 'drizzle-orm/node-postgres'; // 일반 Node.js 용 pg
import { drizzle as awsDrizzle } from 'drizzle-orm/aws-data-api/pg'; // AWS Data API용
import { RDSDataClient } from '@aws-sdk/client-rds-data';
import { fromIni } from '@aws-sdk/credential-providers';
import pg from "pg";

const config = useRuntimeConfig()

export async function useDrizzle() {
    // 로컬 및 서버 환경 판별을 위한 플래그
    const isLocal = process.env.NODE_ENV === 'development';

    console.log(`USER: ${config.db.user}`)

    if (isLocal) {
        // 로컬 환경: 일반 pg 라이브러리 사용
        const pool = new pg.Pool({
            host: config.db.host,
            port: parseInt(config.db.port, 10),
            user: config.db.user,
            password: config.db.password,
            database: config.db.database,
        })

        return drizzle(pool)
    } else {
        // 서버 환경: AWS RDS Data API 사용
        const rdsClient = new RDSDataClient({
            credentials: fromIni({ profile: config.aws.profile }),
            region: config.aws.region,
        });

        return awsDrizzle(rdsClient, {
            database: config.aws.database,
            secretArn: config.aws.secretArn,
            resourceArn: config.aws.resourceArn,
        });
    }
}