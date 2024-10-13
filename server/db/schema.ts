import {pgTable, serial, text, varchar, timestamp, uniqueIndex, boolean, json} from 'drizzle-orm/pg-core';

// 유저 테이블 생성
export const users = pgTable('users', {
    id: serial('id').primaryKey(), // 유저의 고유 식별자
    username: varchar('username', { length: 50 }).notNull(), // 유저명 (닉네임)
    email: varchar('email', { length: 100 }).notNull(), // 이메일 주소
    nickname: varchar('nickname', {length: 50}).notNull(),
    passwordHash: text('password_hash').notNull(), // SHA256 + bcrypt 해시된 패스워드
    createdAt: timestamp('created_at').defaultNow().notNull(), // 유저 생성 일시
    updatedAt: timestamp('updated_at').defaultNow().notNull(), // 유저 정보 업데이트 일시
}, (table) => {
    return {
        // 이메일과 유저명에 대한 유니크 인덱스 설정
        emailIndex: uniqueIndex('users_email_idx').on(table.email),
        usernameIndex: uniqueIndex('users_username_idx').on(table.username),
    };
});

export const publicKeys = pgTable('public_keys', {
    id: serial('id').primaryKey(), // 공개 키의 고유 식별자
    userId: serial('user_id').references(() => users.id), // 유저 테이블과의 외래 키
    publicKey: text('public_key').notNull(), // 공개 키 데이터 (RSA4096 또는 Web3 비대칭 키)
    privateKey: text('private_key').notNull(), // 비밀 키 데이터 (암호화된 형태 저장)
    iv: text('iv').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(), // 공개 키 생성 일시
}, (table) => {
    return {
        // 유저 ID에 대한 유니크 인덱스 설정 (각 유저는 하나의 공개 키만 가질 수 있음)
        userIdIndex: uniqueIndex('public_keys_user_id_idx').on(table.userId),
    };
});

export const diaries = pgTable('diaries', {
    id: serial('id').primaryKey(), // 일기의 고유 식별자
    title: varchar('title', { length: 255 }).notNull(), // 일기 제목
    content: text('content').notNull(), // 일기 내용
    tags: json('tags').default([]), // 감정 태그 (JSON 형식으로 저장)
    agreeToUseTags: boolean('agree_to_use_tags').notNull().default(false), // 감정 태그 사용 동의 여부
    userId: serial('user_id').references(() => users.id), // 사용자 외래 키 (일기와 사용자 관계)
    createdAt: timestamp('created_at').defaultNow().notNull(), // 일기 생성 일시
    updatedAt: timestamp('updated_at').defaultNow().notNull(), // 일기 업데이트 일시
});