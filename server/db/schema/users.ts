import { pgTable } from "drizzle-orm/pg-core/table";
import { serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export default pgTable('users', {
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
})