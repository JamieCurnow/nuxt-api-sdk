import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NitroEventHandler } from 'nitropack'
import { generateSdk, type GenerateSdkOptions } from '../../src/utils/generateSdk'

const h = (route: string | undefined, method?: string, extra: Partial<NitroEventHandler> = {}): NitroEventHandler => ({
  route,
  method: method as NitroEventHandler['method'],
  handler: `/project/server${route}.${method || 'ts'}`,
  ...extra
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sdk = any

/** Compiles the generated module and returns the SDK, wired to a fetch that records its calls */
const load = async (handlers: NitroEventHandler[], opts?: GenerateSdkOptions) => {
  const { outputText } = ts.transpileModule(generateSdk(handlers, opts), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
  })
  const mod = await import(/* @vite-ignore */ `data:text/javascript,${encodeURIComponent(outputText)}`)
  const fetch = vi.fn(async (url: string, options: Record<string, unknown>) => ({ url, options }))
  return { api: mod._useApi({ fetch }) as Sdk, fetch, mod }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('generateSdk', () => {
  it('builds a chainable client for static and dynamic routes', async () => {
    const { api, fetch } = await load([
      h('/api/user', 'post'),
      h('/api/user/:uid', 'get'),
      h('/api/user/:uid', 'patch'),
      h('/api/user/:uid/posts/:postId', 'get')
    ])

    await api.user.post({ body: { name: 'a' } })
    expect(fetch).toHaveBeenLastCalledWith('/api/user', { responseType: 'json', body: { name: 'a' }, method: 'POST' })

    await api.user.uid('abc').get()
    expect(fetch).toHaveBeenLastCalledWith('/api/user/abc', { responseType: 'json', method: 'GET' })

    await api.user.uid(1).patch({ query: { a: 1 } })
    expect(fetch).toHaveBeenLastCalledWith('/api/user/1', { responseType: 'json', query: { a: 1 }, method: 'PATCH' })

    await api.user.uid('u').posts.postId('p').get()
    expect(fetch).toHaveBeenLastCalledWith('/api/user/u/posts/p', expect.objectContaining({ method: 'GET' }))
  })

  it('lets options override the default response type but not the method', async () => {
    const { api, fetch } = await load([h('/api/file', 'get')])
    await api.file.get({ responseType: 'blob', method: 'POST' })
    expect(fetch).toHaveBeenLastCalledWith('/api/file', { responseType: 'blob', method: 'GET' })
  })

  it('url-encodes params, and each segment of a catch-all', async () => {
    const { api, fetch } = await load([h('/api/user/:uid', 'get'), h('/api/docs/**:slug', 'get'), h('/api/blog/**', 'get')])

    await api.user.uid('a b/c?').get()
    expect(fetch.mock.lastCall?.[0]).toBe('/api/user/a%20b%2Fc%3F')

    await api.docs.slug('one/two words').get()
    expect(fetch.mock.lastCall?.[0]).toBe('/api/docs/one/two%20words')

    await api.blog.catchAll('x/y').get()
    expect(fetch.mock.lastCall?.[0]).toBe('/api/blog/x/y')
  })

  it('camelCases keys but keeps the real segment in the url', async () => {
    const { api, fetch } = await load([h('/api/my-route/:org-id/sub-thing', 'get'), h('/api/v1.json', 'get')])

    await api.myRoute.orgId('o').subThing.get()
    expect(fetch.mock.lastCall?.[0]).toBe('/api/my-route/o/sub-thing')

    await api['v1.json'].get()
    expect(fetch.mock.lastCall?.[0]).toBe('/api/v1.json')
  })

  it('escapes segments that would break the template literal', async () => {
    const { api, fetch } = await load([h('/api/a`b${c}\\d', 'get')])
    await api['a`b${c}\\d'].get()
    expect(fetch.mock.lastCall?.[0]).toBe('/api/a`b${c}\\d')
  })

  it('makes param names valid, unique identifiers', async () => {
    const code = generateSdk([h('/api/a/:1st/b/:1st/c/:', 'get')])
    expect(code).toContain('_1st: (_1st: string | number)')
    expect(code).toContain('_1st: (_1st1: string | number)')
    expect(code).toContain('_: (_: string | number)')

    const { api, fetch } = await load([h('/api/a/:1st/b/:1st/c/:', 'get')])
    await api.a._1st('x').b._1st('y').c._('z').get()
    expect(fetch.mock.lastCall?.[0]).toBe('/api/a/x/b/y/c/z')
  })

  it('exposes handlers without a method under every common method', async () => {
    const { api, fetch } = await load([h('/api/health')])
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      await api.health[method]()
      expect(fetch).toHaveBeenLastCalledWith('/api/health', { responseType: 'json', method: method.toUpperCase() })
    }
  })

  it('prefers a handler with a method over a method-less one, in either order', () => {
    for (const handlers of [
      [h('/api/x'), h('/api/x', 'get')],
      [h('/api/x', 'get'), h('/api/x')]
    ]) {
      const code = generateSdk(handlers)
      expect(code).toContain(`get: (...[opts]: Args<Opts<"/api/x", 'get', typeof import("/project/server/api/x.get")>>)`)
      expect(code).toContain(`post: (...[opts]: Args<Opts<"/api/x", 'post', typeof import("/project/server/api/x.ts")>>)`)
      expect(code).toContain(`InternalApi["/api/x"]['default']`)
    }
  })

  it('skips middleware, incomplete handlers, non-api routes and internal routes', () => {
    const code = generateSdk([
      h(undefined, 'get'),
      h('/api/no-file', 'get', { handler: '' }),
      h('/api/mw', undefined, { middleware: true }),
      h('/hello', 'get'),
      h('/apiary', 'get'),
      h('/api/_nuxt_icon/:collection'),
      h('/api/ok', 'get')
    ])
    expect(code).toContain('ok: {')
    for (const skipped of ['noFile', 'mw', 'hello', 'apiary', 'nuxt_icon', 'collection']) {
      expect(code).not.toContain(skipped)
    }
  })

  it('includes a handler on the api base itself', async () => {
    const { api, fetch } = await load([h('/api', 'get')])
    await api.get()
    expect(fetch.mock.lastCall?.[0]).toBe('/api')
  })

  it('respects a custom apiBaseURL', async () => {
    const { api, fetch } = await load([h('/api/x', 'get'), h('/backend/v2/user', 'get')], { apiBaseURL: '/backend/v2/' })
    expect(api.x).toBeUndefined()
    await api.user.get()
    expect(fetch.mock.lastCall?.[0]).toBe('/backend/v2/user')
  })

  it('falls back to the global $fetch', async () => {
    const globalFetch = vi.fn(async () => 'ok')
    vi.stubGlobal('$fetch', globalFetch)
    const { mod } = await load([h('/api/x', 'get')])
    await expect(mod._useApi().x.get()).resolves.toBe('ok')
    expect(globalFetch).toHaveBeenCalledWith('/api/x', { responseType: 'json', method: 'GET' })
  })

  it('types requests with InternalApi and defineRouteType by default', () => {
    const code = generateSdk([h('/api/user/:uid', 'get')])
    expect(code).toContain(`import type { InternalApi } from 'nitropack/types'`)
    expect(code).toContain(`import type { FetchOptions } from 'ofetch'`)
    expect(code).toContain(`Omit<FetchOptions<'json'>, 'method' | ExportedKeys<Mod>> & Exported<Mod>`)
    expect(code).toContain(`Promise<InternalApi["/api/user/:uid"]['get']>`)
    expect(code).not.toContain('TypedServerResponse')
  })

  it('types requests with nuxt route-typed fetch when enabled', () => {
    const code = generateSdk([h('/api/user/:uid', 'get')], { routeTypedFetch: true })
    expect(code).toContain(`import type { AnyServerRouteMethod, TypedFetchOptions, TypedServerResponse } from 'nuxt/app'`)
    expect(code).toContain(`Omit<TypedFetchOptions<Path, Method>, 'method' | ExportedKeys<Mod>> & Exported<Mod>`)
    expect(code).toContain(`Promise<TypedServerResponse<"/api/user/:uid", unknown, 'get'>>`)
    expect(code).not.toContain('InternalApi')
    expect(code).not.toContain('ofetch')
  })

  it('generates an empty client when there are no routes', async () => {
    const { api } = await load([])
    expect(api).toEqual({})
  })
})
