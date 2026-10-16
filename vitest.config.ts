import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const stub = (name: string) => fileURLToPath(new URL(`./test/unit/stubs/${name}`, import.meta.url))

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            // virtual nuxt modules the runtime composable imports
            '#build/nuxt-api-sdk': stub('nuxt-api-sdk.ts'),
            '#imports': stub('imports.ts')
          }
        },
        test: { name: 'unit', include: ['test/unit/**/*.test.ts'] }
      },
      {
        // builds and serves the fixture app, with and without experimental.routeTypedFetch
        test: { name: 'e2e', include: ['test/e2e/**/*.test.ts'] }
      }
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reporter: ['text', 'html'],
      thresholds: { 100: true }
    }
  }
})
