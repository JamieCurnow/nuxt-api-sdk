export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  modules: ['nuxt-api-sdk'],
  experimental: { routeTypedFetch: process.env.ROUTE_TYPED === '1' },
  typescript: { strict: true }
})
