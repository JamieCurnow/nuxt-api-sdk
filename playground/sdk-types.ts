// Type tests for the generated SDK, checked by `npm run test:types` in both fetch modes
const api = useApi()
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false
const expectType = <T>(_v: T) => ({ is: <U>(_check: Equal<T, U>) => {} })

export const run = async () => {
  // response types
  expectType(await api.user.uid('x').get()).is<{ uid: string; name: string; email: string }>(true)
  expectType(await api.health.get()).is<{ ok: true }>(true)
  expectType(await api.org.orgId('x').members.get()).is<{ org: string | undefined }>(true)
  // handlers that only throw still type-check (`never` in legacy mode, `unknown` in route mode)
  await api.teapot.get().catch(() => {})

  // defineRouteType body export still works
  await api.user.post({ body: { email: 'x', name: 'y' } })
  // @ts-expect-error missing field
  await api.user.post({ body: { email: 'x' } })
  // @ts-expect-error body required
  await api.user.post()

  // defineRouteType query export
  await api.search.get({ query: { q: 'x' } })
  // @ts-expect-error wrong query
  await api.search.get({ query: { q: 1 } })

  // options without body on routes that take none
  await api.health.delete({ headers: { a: 'b' } })

  // custom fetch
  useApi({ fetch: $fetch })
  useApi({ fetch: $fetch.create({ baseURL: 'https://example.com' }) })
}
