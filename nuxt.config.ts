// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
    '@sidebase/nuxt-auth',
    '@nuxtjs/mdc'
  ],

  auth: {
    baseURL: process.env.NUXT_AUTH_ORIGIN || 'http://localhost:3099/api/auth',
    provider: {
      type: 'authjs'
    }
  },

  devServer: {
    port: 3099
  }
})
