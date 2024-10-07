import * as schema from '@/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { RSAKeyPairOptions} from 'crypto';
import { createHash, generateKeyPair, pbkdf2, randomBytes,
    createCipheriv } from 'crypto';
import bcrypt from 'bcrypt';
import {getUserSession} from "#imports";

export interface RegisterRequestDTO {
    username: string;
    password: string;
    email: string;
    nickname: string;
}

export interface RegisterResponseDTO {
    id: number;
    username: string;
    email: string;
    nickname: string;
}

const generateKeyPairPromise = (type: stirng, options: RSAKeyPairOptions<"pem", "pem">): Promise<{ publicKey: string, privateKey: string} | Error> => new Promise((resolve, reject) => {
    generateKeyPair(type, options, (err, publicKey: string, privateKey: string) => {
        if(err) reject(err)
        resolve({ publicKey, privateKey })
    })
})

const pbkdf2Promise = (password: string, salt: string, iteration = 10000, keyLength = 32): Promise<Buffer> => new Promise((resolve, reject) => {
    pbkdf2(password, salt, iteration, keyLength, 'sha256', (err, publicKey) => {
        if(err) reject(err)
        resolve(publicKey)
    })
})

const encryptPrivateKeyPromise = (privateKey: string, aesKey: Buffer): Promise<{
    encrypted: string, iv: string
}> => new Promise((resolve, reject) => {
    const iv = randomBytes(16)
    const chiper = createCipheriv('aes-256-cbc', aesKey, iv)
    let encrypted = chiper.update(privateKey, 'utf8', 'hex')
    encrypted += chiper.final('hex')

    resolve({ encrypted, iv: iv.toString('hex')})
})

export default defineEventHandler(async (event) => {
    // 유저 세션 확인
    if (!await getUserSession(event)) return createError({
        status: 403,
        message: 'Already logged in.'
    });

    const body = await readBody(event) as RegisterRequestDTO;

    // 요청 body 확인
    if (!body.email || !body.password || !body.nickname || !body.username) {
        return createError({
            status: 403,
            message: 'Body is wrong.'
        });
    }

    // 데이터베이스 연결
    const db = await useDrizzle();

    // 중복 유저 확인
    const user = await db.query.users.findFirst({
        where: and(eq(schema.users.username, body.username), eq(schema.users.email, body.email))
    }).execute();

    if (user) return createError({
        status: 403,
        message: 'User already exists.'
    });

    const { publicKey, privateKey } = await generateKeyPairPromise('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    })

    // 비밀번호 해싱 (SHA256 -> bcrypt)
    const sha256Hash = createHash('sha256').update(body.password).digest('hex');
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(sha256Hash, saltRounds);

    const aesKey = await pbkdf2Promise(
        body.password,
        randomBytes(16).toString('hex')
    )

    const { encrypted: encryptedPrivateKey, iv } = await encryptPrivateKeyPromise(
        privateKey,
        aesKey
    )

    // 유저 생성
    await db.insert(schema.users).values({
        username: body.username,
        passwordHash,
        email: body.email,
        nickname: body.nickname,
    }).execute();

    // 생성된 유저 정보 확인
    const newUser = await db.query.users.findFirst({
        where: and(eq(schema.users.username, body.username), eq(schema.users.email, body.email))
    }).execute();

    if(!newUser) return createError({
        status: 500,
        message: 'User creation failed.'
    })

    // 공개 키 및 초기화 벡터 정보 생성 및 데이터베이스 저장 (별도 테이블)
    await db.insert(schema.publicKeys).values({
        userId: newUser.id, // 외래 키로 연결
        publicKey,
        privateKey: encryptedPrivateKey, // AES로 암호화된 공개 키
        iv, // 초기화 벡터 저장
        createdAt: new Date(),
    }).execute();

    // 세션 설정
    await setUserSession(event, {
        username: body.username,
        email: body.email,
        nickname: body.nickname,
        id: newUser?.id ?? 0
    });

    const response: RegisterResponseDTO = {
        id: newUser?.id,
        username: newUser?.username,
        email: newUser?.email,
        nickname: newUser?.nickname
    }

    return response
});