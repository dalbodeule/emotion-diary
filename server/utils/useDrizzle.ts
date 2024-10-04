import {drizzle, NodePgQueryResultHKT} from 'drizzle-orm/node-postgres'; // 일반 Node.js 용 pg
import { drizzle as awsDrizzle } from 'drizzle-orm/aws-data-api/pg'; // AWS Data API용
import { RDSDataClient } from '@aws-sdk/client-rds-data';
import pg from 'pg'

import * as schema from "../db/schema"
import {PgDatabase} from "drizzle-orm/pg-core";

const config = useRuntimeConfig()

export async function useDrizzle() {
    // 로컬 및 서버 환경 판별을 위한 플래그
    const isLocal = process.env.NODE_ENV === 'development';

    if (isLocal) return await useDrizzleOnLocal()
    else return await useDrizzleOnAWS();
}

export async function useDrizzleOnLocal() {
    // 로컬 환경: 일반 pg 라이브러리 사용
    const pool = new pg.Pool({
        host: config.db.host,
        port: parseInt(config.db.port, 10),
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
    })
    const client = await pool.connect()
    return drizzle(client, {
        schema: schema
    }) // 로컬 환경에서 사용
}

export async function useDrizzleOnAWS() {
    // 서버 환경: AWS RDS Data API 사용
    const rdsClient = new RDSDataClient({
        region: config.aws.region,
    })

    return awsDrizzle(rdsClient, {
        database: config.aws.database,
        secretArn: config.aws.secretArn,
        resourceArn: config.aws.resourceArn,
        schema: schema
    })
}