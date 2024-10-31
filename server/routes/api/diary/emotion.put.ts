import * as schema from '@/server/db/schema'

export interface EmotionRequestDTO {
    body: string,
}

export interface EmotionResponseDTO {
    recoveryCode: string
}

export default defineEventHandler(async (event) => {
    const body = await readBody(event) as EmotionRequestDTO
    const config = useRuntimeConfig(event)

    const session = getUserSession(event)
    if(!session) return createError({
        status: 403,
        message: 'unauthorized.'
    })

    // 요청 body 검증
    if (!body.body) {
        return createError({
            status: 400,
            message: 'Invalid content provided.'
        })
    }

    const sentences = splitIntoSentences(body.body) // 512글자 이하로 나눈 데이터 배열

    const recoveryCode = generateRecoveryCode(); // 회복 코드 생성 함수 필요

    for (const sentence of sentences) {
        // DB에 요청 내용 저장
        await db.insert(schema.requests).values({
            userId: session.user.id, // 세션에서 사용자 ID 가져오기
            content: sentence,
            recoveryCode: recoveryCode,
            status: 'pending', // 요청의 초기 상태
            createdAt: new Date(),
        }).execute();
    }

    // 추가 로직 (Nitro.js Task 시작 등)
    runTask("diary:emotion")

    const result: EmotionResponseDTO = {
        recoveryCode: recoveryCode,
    }

    return result
});

function splitIntoSentences(content: string): string[] {
    const maxLength = 256

    // 정규 표현식을 사용하여 문장 구분
    const sentences = content.match(/[^.!?]+[.!?]+/g)

    if (!sentences) return [] // 문장이 없으면 빈 배열 반환

    // 각 문장을 512자 이하로 나누기
    const result = []
    for (const sentence of sentences) {
        const trimmed = sentence.trim() // 추가 공백 제거
        if (trimmed.length > maxLength) {
            // 최대 길이를 넘는 경우
            let index = 0
            while (index < trimmed.length) {
                result.push(trimmed.slice(index, index + maxLength))
                index += maxLength
            }
        } else {
            result.push(trimmed) // 512자 이하인 경우 그대로 추가
        }
    }
    return result
}
