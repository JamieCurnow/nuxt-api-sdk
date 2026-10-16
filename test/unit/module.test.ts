import { beforeEach, describe, expect, it, vi } from 'vitest'

const kit = vi.hoisted(() => ({
  addImports: vi.fn(),
  addServerImports: vi.fn(),
  addTemplate: vi.fn(),
  updateTemplates: vi.fn(async (_options: { filter: (template: { filename: string }) => boolean }) => {}),
  // return the definition so the test can call setup with a minimal nuxt
  defineNuxtModule: <T>(definition: T) => definition
}))

vi.mock('@nuxt/kit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nuxt/kit')>()),
  ...kit
}))

const { default: mod } = await import('../../src/module')
const definition = mod as unknown as {
  meta: Record<string, unknown>
  setup: (options: object, nuxt: object) => Promise<void>
}

type Hook = (...args: never[]) => unknown

const setup = async (experimental: Record<string, unknown> = {}) => {
  const hooks: Record<string, Hook> = {}
  const nuxt = {
    options: { experimental },
    hook: (name: string, fn: Hook) => {
      hooks[name] = fn
    }
  }
  await definition.setup({}, nuxt)
  const template = kit.addTemplate.mock.lastCall?.[0] as { filename: string; write: boolean; getContents: () => string }
  return { hooks, template }
}

const createNitro = () => {
  const nitroHooks: Record<string, Hook> = {}
  const nitro = {
    scannedHandlers: [{ route: '/api/scanned', method: 'get', handler: '/s.ts' }],
    options: {
      apiBaseURL: '/api',
      handlers: [{ route: '/api/added', method: 'post', handler: '/a.ts' }]
    },
    hooks: {
      hook: (name: string, fn: Hook) => {
        nitroHooks[name] = fn
      }
    }
  }
  return { nitro, nitroHooks }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('module', () => {
  it('has the right meta', async () => {
    expect(definition.meta).toMatchObject({ name: 'nuxt-api-sdk', compatibility: { nuxt: '>=4.0.0' } })
  })

  it('registers useApi and defineRouteType', async () => {
    await setup()
    expect(kit.addImports).toHaveBeenCalledWith({
      name: 'useApi',
      as: 'useApi',
      from: expect.stringMatching(/runtime\/composables\/useApi$/)
    })
    expect(kit.addServerImports).toHaveBeenCalledWith({
      name: 'defineRouteType',
      as: 'defineRouteType',
      from: expect.stringMatching(/runtime\/server\/defineRouteType$/)
    })
  })

  it('writes an empty sdk before nitro is ready', async () => {
    const { template } = await setup()
    expect(template).toMatchObject({ filename: 'nuxt-api-sdk.ts', write: true })
    expect(template.getContents()).toContain('return {\n  }')
  })

  it('generates the sdk from scanned and module-added nitro handlers', async () => {
    const { hooks, template } = await setup()
    const { nitro } = createNitro()
    hooks['nitro:init']!(nitro as never)

    const code = template.getContents()
    expect(code).toContain('scanned: {')
    expect(code).toContain('added: {')
    expect(code).toContain('InternalApi')
  })

  it('uses route-typed fetch types when the experimental flag is on', async () => {
    const { hooks, template } = await setup({ routeTypedFetch: true })
    hooks['nitro:init']!(createNitro().nitro as never)
    expect(template.getContents()).toContain('TypedServerResponse')
  })

  it('regenerates the sdk when nitro rewrites its types', async () => {
    const { hooks, template } = await setup()
    const { nitro, nitroHooks } = createNitro()
    hooks['nitro:init']!(nitro as never)

    await nitroHooks['types:extend']!()
    expect(kit.updateTemplates).toHaveBeenCalledOnce()
    const { filter } = kit.updateTemplates.mock.lastCall![0]
    expect(filter(template)).toBe(true)
    expect(filter({ filename: 'other.ts' })).toBe(false)
  })
})
