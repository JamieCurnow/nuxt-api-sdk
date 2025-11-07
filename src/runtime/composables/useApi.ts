import { _useApi } from '#build/useApi'

// this just means you can go useApi() in userland
// rather than having to import { useApi } from '#build/useApi'

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
export const useApi = _useApi
