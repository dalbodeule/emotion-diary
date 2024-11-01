import schema from '@/server/db/schema'
import {count, desc, eq} from "drizzle-orm";

export interface IDiary {
    id: number,
    title: string,
    content: string,
    tags: string[],
    agreeToUseTags: boolean,
    userId: number,
    createdAt: Date,
    updatedAt: Date,
}

export interface DiaryListResponseDTO {
    diaries: IDiary[],
    pagination: {
        total: number,
        page: number,
        totalPages: number
    }
}

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1 // 기본값을 1로 설정
    const limit = 10 // 한 페이지당 반환할 일기 개수

    const session = await getUserSession(event)

    if(!session) return createError({
        statusCode: 401,
        message: 'session expired.',
    })

    const db = await useDrizzle()

    // 페이지네이션 계산
    const offset = (page - 1) * limit

    // DB에서 일기 목록 조회
    const diaryList = await db.query.diaries.findMany({
        where: eq(schema.diaries.userId, session.user.id),
        orderBy: desc(schema.diaries.createdAt),
        limit: limit,
        offset: offset,
    }).execute()

    // 총 일기의 개수를 구합니다
    const totalDiariesCount = await db.select({ count: count() })
        .from(schema.diaries)
        .where(eq(schema.diaries.userId, session.user.id))
        .execute()

    const response: DiaryListResponseDTO = {
        diaries: diaryList,
        pagination: {
            total: totalDiariesCount[0].count,
            page: page,
            totalPages: Math.ceil(totalDiariesCount[0].count / limit), // 총 페이지 수 계산
        },
    }

    return response
})