import schema from '@/server/db/schema'
import { eq } from "drizzle-orm";
import { publicEncrypt, constants } from 'crypto'

export interface DiaryCreateDTO {
    title: string,
    content: string,
    tags: string[],
    agreeToUseTags: boolean,
}

export default defineEventHandler(async (event) => {
    const session = await getUserSession(event)

    if (!session) return createError({
        statusCode: 401,
        message: 'unauthorized.',
    })

    const body = await readBody(event) as DiaryCreateDTO

    if (!body.title || !body.content || !body.tags) return createError({
        statusCode: 403,
        message: 'body is wrong.'
    })

    const db = await useDrizzle()

    const user = await db.query.users.findFirst({
        where: eq(schema.users.id, session.user.id) // 이메일로 사용자 조회
    }).execute();

    if (!user) {
        return createError({ status: 404, message: 'User not found.' });
    }

    const publicKeys = await db.query.publicKeys.findFirst({
        where: eq(schema.publicKeys.userId, user.id)
    }).execute()

    if (!publicKeys) return createError({
        statusCode: 403,
        message: 'Public key is wrong.'
    })

    const encryptedContent = publicEncrypt({
        key: publicKeys.publicKey,
        padding: constants.RSA_PKCS1_PADDING
    }, Buffer.from(body.content, 'utf8')
    ).toString('base64');

    await db.insert(schema.diaries).values({
        title: body.title,
        content: encryptedContent,
        tags: body.tags,
        agreeToUseTags: body.agreeToUseTags,
        userId: user.id
    })

    return { statusCode: 200 }
})