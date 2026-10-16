import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('ssr with experimental.routeTypedFetch', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../fixtures/basic', import.meta.url)),
    nuxtConfig: { experimental: { routeTypedFetch: true } }
  })

  it('calls the api during SSR', async () => {
    const html = await $fetch<string>('/')
    expect(html).toContain('<div>basic</div>')
    expect(html).toContain('<div id="health">true</div>')
  })

  it('builds urls for params and catch-alls', async () => {
    const html = await $fetch<string>('/')
    expect(html).toContain('<div id="org">a b</div>')
    expect(html).toContain('<div id="slug">one/two</div>')
  })

  it('sends the method, body and query', async () => {
    const html = await $fetch<string>('/')
    expect(html).toContain('<div id="echo">POST jamie 2</div>')
  })
})
