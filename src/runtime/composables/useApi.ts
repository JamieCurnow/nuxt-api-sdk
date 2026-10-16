import { _useApi, type ApiFetch } from '#build/nuxt-api-sdk'
import { useRequestFetch } from '#imports'

// this just means you can go useApi() in userland
// rather than having to import { useApi } from '#build/nuxt-api-sdk'

/**
 * Provides chained access to API routes based on the nuxt API
 * endpoints in server/api.
 *
 * @example
 * await useApi().user.post({ body: { uid: 'abc123' } })
 * const user = await useApi().user.uid('abc123').get()
 *
 * The actual type signature will be based on the server routes
 * in your project.
 */
export const useApi = (opts?: { fetch?: ApiFetch }): ReturnType<typeof _useApi> => {
  let fetch = opts?.fetch
  if (!fetch) {
    // forward the request's headers and cookies during SSR, like useFetch does.
    // useRequestFetch needs the nuxt context, so fall back to the global $fetch outside of it
    try {
      fetch = useRequestFetch() as unknown as ApiFetch
    } catch {
      fetch = globalThis.$fetch as unknown as ApiFetch
    }
  }
  return _useApi({ fetch })
}
