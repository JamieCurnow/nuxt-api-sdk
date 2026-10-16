export default defineNuxtConfig({
  modules: ['../src/module'],
  devtools: { enabled: true },
  experimental: {
    routeTypedFetch: true
  }
})
