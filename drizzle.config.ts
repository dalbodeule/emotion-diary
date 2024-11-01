import { defineConfig } from "drizzle-kit"
import { config } from 'dotenv'

config()

export default defineConfig({
    dialect: 'postgresql',
    schema: './server/db/schema',
    out: './server/db/migrations',
    dbCredentials: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DATABASE_NAME,
        ssl: false
    }
})