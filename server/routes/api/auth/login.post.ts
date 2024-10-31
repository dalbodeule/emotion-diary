import bcrypt from "bcrypt"
import * as schema from "@/server/db/schema"
import { and, eq } from "drizzle-orm";
import type { RegisterResponseDTO } from "~/server/routes/api/auth/register.put";
import { createHash } from "crypto";

export interface LoginRequestDTO {
    username: string;
    password: string;
}

export interface LoginResponseDTO extends RegisterResponseDTO {}

export default defineEventHandler(async (event) => {
    // 유저 세션 확인
    if (!await getUserSession(event)) return createError({
        status: 403,
        message: 'Already logged in.'
    });

    const body = await readBody(event) as LoginRequestDTO

    // 요청 body 확인
    if (!body.password || !body.username) {
        return createError({
            status: 403,
            message: 'Body is wrong.'
        });
    }

    // 데이터베이스 연결
    const db = await useDrizzle();

    // 중복 유저 확인
    const user = await db.query.users.findFirst({
        where: and(eq(schema.users.username, body.username))
    }).execute();

    if (!user) return createError({
        status: 403,
        message: 'Wrong credentials.'
    });

    const sha256Hash = createHash('sha256').update(body.password).digest('hex');
    const isPasswordCorrect = await new Promise((resolve, reject) => {
        bcrypt.compare(sha256Hash, user.passwordHash, (err, isMatch) => {
            if (err) return reject(err);
            return resolve(isMatch);
        })
    })

    if(!isPasswordCorrect) return createError({
        status: 403,
        message: 'Wrong credentials.'
    })

    /* const credentials = await db.query.publicKeys.findFirst({
        where: eq(schema.publicKeys.userId, user.id)
    })

    if (!credentials) return createError({
        status: 403,
        message: 'Wrong credentials.'
    })

    const aesKey = await pbkdf2Promise(
        body.password,
        credentials.salt
    )

    const privateKey = await decryptPrivateKeyPromise(credentials.privateKey, aesKey, credentials.iv) */

    // 세션 설정
    await setUserSession(event, {
        user: {
            username: user.username,
            email: user.email,
            nickname: user.nickname,
            id: user.id
        },
        loggedInAt: new Date(),
    });

    const response: LoginResponseDTO = {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname
    }

    return response
})
