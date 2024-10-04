import { eq } from 'drizzle-orm'
import { useDrizzle } from '@/server/utils/useDrizzle'
import * as schema  from '@/server/db/schema'

export interface UsernameIsExistsResponseDTO {
    exists: boolean
}

export default defineEventHandler(async (event) => {
    // `username` 쿼리 매개변수 추출
    const username = getRouterParam(event, 'username')

    // 유효성 확인
    if (!username) {
        return {
            exists: false, // `username`이 유효하지 않을 경우 중복 아님으로 처리
        }
    }

    // 데이터베이스 연결
    const db = await useDrizzle()

    // 데이터베이스에서 `username` 확인
    const user = await db.query.users.findFirst({
        where: eq(schema.users.username, username),
    }).execute()

    // 중복 여부 반환
    const response: UsernameIsExistsResponseDTO = {
        exists: !!user, // `username`이 존재하면 `true`, 아니면 `false`
    };

    return response
});
