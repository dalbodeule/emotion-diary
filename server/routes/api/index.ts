import {useDrizzle} from "~/server/utils/useDrizzle";

export default defineEventHandler(async(_event) => {
    const db = await useDrizzle()

    console.log(await db.execute('show tables'))

    return 'Hello World'
})