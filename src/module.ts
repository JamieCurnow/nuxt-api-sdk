import { defineNuxtModule, addImports, addTemplate, createResolver, addServerImports, updateTemplates } from '@nuxt/kit'
import type { Nitro } from 'nitropack'
import { generateSdk } from './utils/generateSdk'

const TEMPLATE_FILENAME = 'nuxt-api-sdk.ts'

export default defineNuxtModule({
  meta: {
    name: 'nuxt-api-sdk',
    compatibility: {
      nuxt: '>=4.0.0'
    }
  },
  async setup(_options, nuxt) {
    const resolver = createResolver(import.meta.url)

    addImports({
      name: 'useApi',
      as: 'useApi',
      from: resolver.resolve('runtime/composables/useApi')
    })

    addServerImports({
      name: 'defineRouteType',
      as: 'defineRouteType',
      from: resolver.resolve('runtime/server/defineRouteType')
    })

    let nitro: Nitro | undefined
    nuxt.hook('nitro:init', (_nitro) => {
      nitro = _nitro
      // nitro rescans its handlers when server routes are added or removed in dev,
      // and writes its types again afterwards
      nitro.hooks.hook('types:extend', async () => {
        await updateTemplates({ filter: (template) => template.filename === TEMPLATE_FILENAME })
      })
    })

    addTemplate({
      filename: TEMPLATE_FILENAME,
      write: true,
      getContents: () => {
        return generateSdk([...(nitro?.scannedHandlers || []), ...(nitro?.options.handlers || [])], {
          apiBaseURL: nitro?.options.apiBaseURL,
          routeTypedFetch: !!(nuxt.options.experimental as { routeTypedFetch?: boolean }).routeTypedFetch
        })
      }
    })
  }
})
