import {serial, timestamp, varchar} from "drizzle-orm/pg-core";
import {pgTable} from "drizzle-orm/pg-core/table";
import users from "~/server/db/schema/users";

export default pgTable('emails', {
    id: serial('id').primaryKey(),
    user_id: serial('user_id').references(() => users.id),
    recovery_code: varchar('recovery_code').notNull(),
    sent_at: timestamp('sent_at').defaultNow().notNull(),
})