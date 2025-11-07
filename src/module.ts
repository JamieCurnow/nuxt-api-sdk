import {
  defineNuxtModule,
  addImports,
  addTemplate,
  useNitro,
  createResolver,
  addServerImports
} from '@nuxt/kit'
import { generateSdk } from './utils/generateSdk'

export default defineNuxtModule({
  meta: {
    name: 'sdk-module'
  },
  async setup(_options, nuxt) {
    console.log('[sdk-module]: Generating useApi composable')

    const resolver = createResolver(import.meta.url)

    addImports({
      name: 'useApi', // name of the composable to be used
      as: 'useApi',
      from: resolver.resolve('runtime/composables/useApi') // path of composable
    })

    addServerImports({
      name: 'defineRouteType', // name of the composable to be used
      as: 'defineRouteType',
      from: resolver.resolve('runtime/server/defineRouteType') // path of composable
    })

    nuxt.hook('ready', async () => {
      const handlers = useNitro().scannedHandlers
      addTemplate({
        filename: 'useApi.ts',
        getContents: () => generateSdk(handlers),
        write: true
      })
    })

    // nuxt.hook('')
  }
})
