import {serial, text, timestamp} from "drizzle-orm/pg-core";
import {pgTable} from "drizzle-orm/pg-core/table";
import users from "~/server/db/schema/users";

export default pgTable('private_key_shares', {
    id: serial('id').primaryKey(),
    user_id: serial('user_id').references(() => users.id), // 외래 키
    share: text('share').notNull(), // Shamir share
    created_at: timestamp('created_at').defaultNow().notNull(),
})