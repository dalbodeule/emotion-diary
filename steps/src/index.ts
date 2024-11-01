import {
    SageMakerRuntimeClient,
    InvokeEndpointCommand,
    InvokeEndpointCommandInput
} from "@aws-sdk/client-sagemaker-runtime";
import { SecretsManager } from "@aws-sdk/client-secrets-manager"
import { Client } from 'pg';

const client = new SageMakerRuntimeClient({});

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

async function invokeSageMakerModel(endpointName: string, inputData: string[]): Promise<{ label: string, score: number }[]> {
    const params: InvokeEndpointCommandInput = {
        EndpointName: endpointName,
        Body: JSON.stringify({ inputs: inputData }),
        ContentType: 'application/json',
    };
    const command = new InvokeEndpointCommand(params);
    const data = await client.send(command);
    return JSON.parse(new TextDecoder().decode(data.Body));
}

export const handler = async (event: any = {}): Promise<any> => {
    const dbCredentials = await getSecretValue(process.env.DB_SECRETS as string)
    const endpoint = process.env.EMOTION_ENDPOINT as string

    const dbClient = new Client({
        host: dbCredentials.host,
        port: parseInt(dbCredentials.port, 10),
        user: dbCredentials.username,
        password: dbCredentials.password,
        database: dbCredentials.dbname,
    });

    await dbClient.connect();

    try {
        let hasPendingRequests = true;

        while (hasPendingRequests) {
            // `pending` 상태의 요청 최대 16개 조회
            const pendingRequests = await dbClient.query(
                'SELECT id, content FROM requests WHERE status = $1 ORDER BY created_at LIMIT 16',
                ['pending']
            );

            if (pendingRequests.rows.length === 0) {
                console.log("No more pending requests found.");
                hasPendingRequests = false;
                break;
            }

            for (const value of pendingRequests.rows) {
                await dbClient.query(`UPDATE requests SET updated_at = $1, status = $2 WHERE id = $3`,
                    [new Date(), 'calculated', value.id])
            }

            const contents = pendingRequests.rows.map((value) => value.content as string)
            const idList = pendingRequests.rows.map((value) => value.id as number)

            // SageMaker 모델 호출
            const response = await invokeSageMakerModel(endpoint, contents);

            for (const value of response) {
                const idx = response.indexOf(value);
                // 감정 분석 결과를 RDS에 업데이트
                const emotions = JSON.stringify(response);
                await dbClient.query(
                    'UPDATE requests SET emotions = $1, updated_at = $2, status = $3 WHERE id = $4',
                    [emotions, new Date(), 'completed', idList[idx]]
                )
            }

            // 잠시 대기 후 반복 실행 (필요 시)
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
        }
    } catch (error) {
        console.error("Error updating emotions:", error);
        for (const value of pendingRequests.rows) {
            await dbClient.query(`UPDATE requests SET updated_at = $1, status = $2 WHERE id = $3`,
                [new Date(), 'pending', value.id])
        }
        throw error;
    } finally {
        await dbClient.end();
    }

    return { status: 'SUCCESS' };
};

