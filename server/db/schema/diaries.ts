import { pgTable } from "drizzle-orm/pg-core";
import { boolean, json, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import users from "~/server/db/schema/users";

export default pgTable('diaries', {
    id: serial('id').primaryKey(), // 일기의 고유 식별자
    title: varchar('title', { length: 255 }).notNull(), // 일기 제목
    content: text('content').notNull(), // 일기 내용
    tags: json('tags').default([]), // 감정 태그 (JSON 형식으로 저장)
    agreeToUseTags: boolean('agree_to_use_tags').notNull().default(false), // 감정 태그 사용 동의 여부
    userId: serial('user_id').references(() => users.id), // 사용자 외래 키 (일기와 사용자 관계)
    createdAt: timestamp('created_at').defaultNow().notNull(), // 일기 생성 일시
    updatedAt: timestamp('updated_at').defaultNow().notNull(), // 일기 업데이트 일시
});