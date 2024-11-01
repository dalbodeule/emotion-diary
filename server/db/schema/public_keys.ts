import { serial, text, timestamp, uniqueIndex, varchar} from "drizzle-orm/pg-core"
import { pgTable } from "drizzle-orm/pg-core/table"
import users from './users'

export default pgTable('public_keys', {
    id: serial('id').primaryKey(), // 공개 키의 고유 식별자
    userId: serial('user_id').references(() => users.id), // 유저 테이블과의 외래 키
    publicKey: text('public_key').notNull(), // 공개 키 데이터 (RSA4096 또는 Web3 비대칭 키)
    privateKey: text('private_key').notNull(), // 비밀 키 데이터 (암호화된 형태 저장)
    iv: text('iv').notNull(),
    salt: varchar('salt', { length: 256 }),
    createdAt: timestamp('created_at').defaultNow().notNull(), // 공개 키 생성 일시
}, (table) => {
    return {
        // 유저 ID에 대한 유니크 인덱스 설정 (각 유저는 하나의 공개 키만 가질 수 있음)
        userIdIndex: uniqueIndex('public_keys_user_id_idx').on(table.userId),
    };
});