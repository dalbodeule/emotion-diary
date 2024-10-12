// https://nuxt.com/docs/api/configuration/nuxt-config
import type {VitePWAOptions} from "vite-plugin-pwa";

export default defineNuxtConfig({
  compatibilityDate: '2024-10-04',
  devtools: { enabled: true },
  nitro: {
    preset: 'aws-lambda',
  },
  srcDir: '.',
  app: {
    app: 'app',
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
    workbox: {
      runtimeCaching: [
        {
          urlPattern: ({ request }) => request.destination === 'document',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'html-cache'
          }
        },
        {
          urlPattern: ({request}) => (request.url as string).includes("/api"),
          handler: 'NetworkOnly', // 네트워크에서만 요청, 캐싱 사용 안 함
          options: {
            cacheName: 'api-nocache'
          }
        },
        {
          urlPattern: ({ request }) => ['script', 'style', 'worker'].includes(request.destination),
          handler: 'NetworkFirst',
          options: {
            cacheName: 'assets-cache',
          },
        },
        {
          urlPattern: ({ request }) => request.destination === 'image',
          handler: 'NetworkFirst', // 이미지도 항상 네트워크 우선
          options: {
            cacheName: 'image-cache',
          },
        },
        {
          urlPattern: ({ request }) => request.destination === 'font',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'font-cache',
          },
        }
      ],
    },
    registerType: 'autoUpdate', // 새로운 서비스 워커가 감지되면 자동 업데이트
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
    "@pinia/nuxt",
    "@nuxtjs/turnstile",
    "@nuxt/eslint",
    "nuxt-purgecss",
    '@vite-pwa/nuxt',
    "nuxt-auth-utils"
  ]
})