import {useDrizzle} from "~/server/utils/useDrizzle";
import {sql} from "drizzle-orm";

export default defineEventHandler(async(_event) => {
    const db = await useDrizzle()

    console.log(await db.execute(sql`SELECT * FROM pg_catalog.pg_tables`))

    return 'Hello World'
})