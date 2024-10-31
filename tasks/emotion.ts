import type {SageMakerRuntime} from 'aws-sdk';
import AWS from 'aws-sdk'
import * as schema from '@/server/db/schema'
import {eq} from "drizzle-orm";

const runtime = new AWS.SageMakerRuntime();

async function invokeSageMakerModel(endpointName: string, inputData: any): Promise<{ label: string, score: number}[]> {
    const params: SageMakerRuntime.Types.InvokeEndpointInput = {
        EndpointName: endpointName,
        Body: JSON.stringify(inputData),  // 모델에 전달할 데이터
        ContentType: 'application/json',
    };

    try {
        const data = await runtime.invokeEndpoint(params).promise();
        const responseBody = JSON.parse(data.Body.toString());
        console.log('Model Response:', responseBody);
        return responseBody;
    } catch (error) {
        console.error('Error invoking SageMaker Model:', error);
        throw error;
    }
}

export default defineTask({
    meta: {
        name: "diary:emotion",
        description: "emotion inference queue handler"
    },
    async run(event) {
        const config = useRuntimeConfig(event)
        const db = await useDrizzle()

        try {
            const endpoint = `${config.bert.endpoint}`
            // 모델에 요청
            // 여러 문장을 포함한 요청
            while (true) {
                const pendingRequests = await db.query.requests.findMany({
                    where: eq(schema.requests.status, 'pending'),
                    limit: 16
                }).execute();

                if (pendingRequests.length <= 0) break

                const response = await invokeSageMakerModel(endpoint, {
                    inputs: pendingRequests,
                    options: {
                        use_gpu: false, // GPU 사용 여부
                        wait_for_model: true // 모델 로드가 끝날 때까지 대기
                    }
                }) // 응답에서 labels 추출

                const labels = response.map((value) =>
                    value.score >= 0.5 ? value.label : null
                )

                if (!Array.isArray(labels)) {
                    return createError({status: 500, message: 'Invalid response from model.'})
                }
            }
        } catch (error) {
            console.error('Error fetching emotion labels:', error)
            return createError({ status: 500, message: 'Error processing the request.' })
        }
    }
})
