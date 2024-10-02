// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-08-22',
  devtools: { enabled: true },
  nitro: {
    preset: 'aws-lambda',
  },
  css: [
    "@/assets/css/main.css"
  ],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {}
    }
  },
  runtimeConfig: {
    db: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DATABASE_NAME,
    },
    aws: {
      secretArn: process.env.AWS_SECRET_ARN,
      resourceArn: process.env.AWS_RESOURCE_ARN,
      region: process.env.AWS_REGION,
      profile: process.env.AWS_PROFILE,
      database: process.env.DATABASE_NAME,
    }
  },
  modules: ["@nuxtjs/turnstile", "@nuxt/eslint"]
})