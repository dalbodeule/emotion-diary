// https://nuxt.com/docs/api/configuration/nuxt-config
import type {VitePWAOptions} from "vite-plugin-pwa";

export default defineNuxtConfig({
  compatibilityDate: '2024-10-04',
  devtools: { enabled: true },
  nitro: {
    preset: 'aws-lambda',
  },
  app: {
    cdnURL: '/static',
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      link: [{
        rel: 'icon', href: `${process.env.NODE_ENV === 'development' ? '' : '/static'}/favicon.ico`,
      }]
    }
  },
  css: [
    '@fortawesome/fontawesome-svg-core/styles.css',
    "@/node_modules/bulma/bulma.scss",
    "@/assets/css/main.scss",
  ],
  pwa: <VitePWAOptions> {
    base: process.env.NODE_ENV === 'development' ? '' : '/static/',
    manifest: {
      name: "Em0ti",
      theme_color: "#fdf6e3",
      start_url: '/',
      lang: 'ko-KR',
      lang: 'ko-KR',
      icons: [
        {
          src: `${ process.env.NODE_ENV === 'development' ? '' : '/static'}/favicon.png`,
          sizes: '1024x1024',
          type: 'image/png'
        },
        {
          src: `${ process.env.NODE_ENV === 'development' ? '' : '/static'}/favicon.ico`,
          sizes: '256x256',
          type: 'image/x-icon',
        }
      ]
    },
    devOptions: {
      enabled: false,
      type: 'module'
    }
  },
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
    "nuxt-purgecss",
    '@vite-pwa/nuxt'
  ]
})