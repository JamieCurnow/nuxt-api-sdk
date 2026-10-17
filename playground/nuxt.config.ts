export default defineNuxtConfig({
  modules: ['../src/module'],
  devtools: { enabled: true },
  experimental: {
    // LEGACY_FETCH=1 type-checks the SDK against nitro's InternalApi instead
    routeTypedFetch: !process.env.LEGACY_FETCH
  }
})
