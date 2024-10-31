import {
    SageMakerRuntimeClient,
    InvokeEndpointCommand,
    InvokeEndpointCommandInput
} from "@aws-sdk/client-sagemaker-runtime";
import * as schema from '@/server/db/schema'
import { asc, eq } from "drizzle-orm";

const client = new SageMakerRuntimeClient({});

async function invokeSageMakerModel(endpointName: string, inputData: any): Promise<{ label: string, score: number }[]> {
    const params: InvokeEndpointCommandInput = {
        EndpointName: endpointName,
        Body: JSON.stringify(inputData),  // 모델에 전달할 데이터
        ContentType: 'application/json',
    };

    try {
        const command = new InvokeEndpointCommand(params);
        const data = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(data.Body));
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
        const db = await useDrizzle()

        try {
            const endpoint = event.payload.endpoint
            // 모델에 요청
            // 여러 문장을 포함한 요청
            while (true) {
                const pendingRequests = await db.query.requests.findMany({
                    where: eq(schema.requests.status, 'pending'),
                    limit: 16,
                    orderBy: asc(schema.requests.createdAt)
                }).execute();

                if (pendingRequests.length <= 0) break

                const response = await invokeSageMakerModel(endpoint, {
                    inputs: pendingRequests.map((value) => value.content),
                    options: {
                        use_gpu: false, // GPU 사용 여부
                        wait_for_model: true // 모델 로드가 끝날 때까지 대기
                    }
                }) // 응답에서 labels 추출

                const update = response.map((value, idx) => {
                    return { emotions: JSON.stringify(value), id: pendingRequests[idx].id, updated_at: new Date() }
                })
                await db.update(schema.requests).set(update).execute()

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
