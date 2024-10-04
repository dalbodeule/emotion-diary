// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-10-04',
  devtools: { enabled: true },
  nitro: {
    preset: 'aws-lambda',
  },
  css: [
    '@fortawesome/fontawesome-svg-core/styles.css',
    "@/node_modules/bulma/bulma.scss",
    "@/assets/css/main.scss",
  ],
  purgecss: {
    safelist: [/svg.*/, /fa.*/]
  },
  build: {
    transpile: ['Dayjs'],
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
    },
    turnstile: {
      secretKey: process.env.TURNSTILE_SECRET_KEY,
      siteKey: process.env.TURNSTILE_SITE_KEY,
    },
  },
  modules: [
    "@nuxtjs/turnstile",
    "@nuxt/eslint",
    "nuxt-auth-utils",
    "nuxt-purgecss"
  ]
})