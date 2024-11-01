import {serial, timestamp, varchar} from "drizzle-orm/pg-core";
import {pgTable} from "drizzle-orm/pg-core/table";
import users from "~/server/db/schema/users";

export default pgTable('user_credentials', {
    id: serial('id').primaryKey(),
    user_id: serial('user_id').references(() => users.id), // 외래 키 (users 테이블 참조)
    security_question: varchar('security_question', { length: 255 }).notNull(), // 보안 질문
    security_answer: varchar('security_answer', { length: 255 }).notNull(), // 해시된 보안 질문 응답
    recovery_code: varchar('recovery_code', { length: 50 }).notNull(), // 이메일로 발송되는 복구 코드
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
});
