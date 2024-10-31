import * as schema from '@/server/db/schema'
import {eq} from "drizzle-orm";

export interface EmotionRequestReturnDTO {
    recoveryCode: string
}

export interface EmotionResponseReturnDTO {
    emotions: number[],
    labels: number[][]
}

// 감정을 집계하는 함수
function aggregateEmotions(emotionResults: string|null[]): { [key: string]: number } {
    const emotionCounts: { [key: string]: number } = {}

    // 각 감정 라벨에 대해 카운트 추가
    for (const label in emotionResults) {
        if(!label) continue

        if (emotionCounts[label]) {
            emotionCounts[label]++
        } else {
            emotionCounts[label] = 1
        }
    }

    return emotionCounts // 감정 카운트 객체 반환
}

export default defineEventHandler(async (event) => {
    const body = await readBody(event) as EmotionRequestReturnDTO
    const config = useRuntimeConfig(event)

    const session = getUserSession(event)
    if(!session) return createError({
        status: 403,
        message: 'unauthorized.'
    })

    // 요청 body 검증
    if (!body.recoveryCode) {
        return createError({
            status: 400,
            message: 'Invalid content provided.'
        })
    }

    const db = await useDrizzle()

    const requestStatus = await db.query.requests.findMany({
        where: eq(schema.requests.recoveryCode, body.recoveryCode),
    }).execute();

    if(!requestStatus) return createError({
        status: 404,
        message: 'not found.'
    })

    if(requestStatus.map((value) =>
        value.status == 'pending'
    ).length >= 1) return createError({
            status: 102,
            message: 'pending.'
        })

    const labels = requestStatus.map((value) =>
        JSON.parse(value.content)
    )

    // 감정 집계
    const emotions = aggregateEmotions(labels)
    const result: EmotionResponseReturnDTO = {
        emotions,
        labels
    }

    return result
})