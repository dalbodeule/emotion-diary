import {pgTable} from "drizzle-orm/pg-core/table";
import {serial, text, varchar, timestamp} from "drizzle-orm/pg-core";
import users from "~/server/db/schema/users";

export default pgTable('requests', {
    id: serial('id').primaryKey(),             // 요청의 고유 식별자
    userId: serial('user_id').references(() => users.id), // 사용자 외래 키
    content: text('content').notNull(),         // 요청 내용
    recoveryCode: varchar('recovery_code', { length: 50 }).notNull(), // 복구 코드
    status: varchar('status', { length: 50 }).notNull(), // 요청 상태 (pending, completed 등)
    emotions: text('emotions'),                 // 감정 결과를 저장
    createdAt: timestamp('created_at').defaultNow().notNull(), // 요청 생성 시간
    updatedAt: timestamp('updated_at').defaultNow().notNull(), // 요청 최종 업데이트 시간
});