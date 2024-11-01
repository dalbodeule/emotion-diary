import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'; // 일반 Node.js 용 pg
import { SecretsManager } from '@aws-sdk/client-secrets-manager';
import pg from 'pg'

import schema from "@/server/db/schema"

const config = useRuntimeConfig()

export async function useDrizzle(): Promise<NodePgDatabase<typeof schema>> {
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
        schema
    }) // 로컬 환경에서 사용
}

export async function useDrizzleOnAWS() {
    const dbCredentials = await getSecretValue(config.aws.secretArn as string);

    const pool = new pg.Pool({
        host: dbCredentials.host,
        port: parseInt(dbCredentials.port, 10),
        user: dbCredentials.username,
        password: dbCredentials.password,
        database: dbCredentials.dbname,
    })
    const client = await pool.connect()
    return drizzle(client, {
        schema
    })// 로컬 환경에서 사용
}

// 비밀 정보 가져오기 함수
async function getSecretValue(secretArn: string) {
    const secretsManager = new SecretsManager({ region: process.env.NUXT_AWS_REGION });
    try {
        // 비밀 가져오기
        const secretData = await secretsManager.getSecretValue({ SecretId: secretArn });

        if (secretData.SecretString) {
            // 비밀이 문자열 형식일 경우 파싱
            return JSON.parse(secretData.SecretString);
        }
        throw new Error('Secret is not in a valid format.');
    } catch (error) {
        console.error('Failed to retrieve secret:', error);
        throw error;
    }
}
