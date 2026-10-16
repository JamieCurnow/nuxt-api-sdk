import { afterEach, describe, expect, it, vi } from 'vitest'
import * as imports from '#imports'
import { useApi } from '../../src/runtime/composables/useApi'
import { defineRouteType } from '../../src/runtime/server/defineRouteType'

vi.mock('#imports', () => ({ useRequestFetch: vi.fn() }))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.mocked(imports.useRequestFetch).mockReset()
})

describe('useApi', () => {
  it('uses the fetch it is given', () => {
    const fetch = vi.fn()
    expect(useApi({ fetch })).toEqual({ fetch })
    expect(imports.useRequestFetch).not.toHaveBeenCalled()
  })

  it('defaults to useRequestFetch so SSR forwards headers', () => {
    const requestFetch = vi.fn()
    vi.mocked(imports.useRequestFetch).mockReturnValue(requestFetch as never)
    expect(useApi()).toEqual({ fetch: requestFetch })
  })

  it('falls back to the global $fetch outside of a nuxt context', () => {
    const globalFetch = vi.fn()
    vi.stubGlobal('$fetch', globalFetch)
    vi.mocked(imports.useRequestFetch).mockImplementation(() => {
      throw new Error('nuxt instance unavailable')
    })
    expect(useApi()).toEqual({ fetch: globalFetch })
  })
})

describe('defineRouteType', () => {
  it('is a type-only marker with no runtime value', () => {
    expect(defineRouteType<{ a: string }>()).toBeNull()
  })
})
