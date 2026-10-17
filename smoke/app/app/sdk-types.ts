// Type assertions that must hold in BOTH fetch modes. Never executed, only type-checked.
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false
const expectTrue = <_T extends true>() => {}
type R<P> = Awaited<P>

export function checks() {
  const api = useApi()

  // responses
  expectTrue<Equal<R<ReturnType<typeof api.health.get>>, { ok: boolean; method: string }>>()
  expectTrue<Equal<R<ReturnType<typeof api.users.get>>, { id: number; name: string }[]>>()
  expectTrue<Equal<R<ReturnType<ReturnType<typeof api.users.id>['get']>>, { id: string; name: string }>>()
  expectTrue<Equal<R<ReturnType<typeof api.users.post>>, { created: string; age: number | null }>>()
  expectTrue<Equal<R<ReturnType<typeof api.search.get>>, { q: string; limit: number }>>()
  expectTrue<Equal<R<ReturnType<ReturnType<typeof api.docs.slug>['get']>>, { slug: string }>>()
  expectTrue<Equal<R<ReturnType<ReturnType<typeof api.org.orgId>['members']['get']>>, { org: string }>>()

  // defineRouteType body is required and checked
  api.users.post({ body: { name: 'a' } })
  api.users.post({ body: { name: 'a', age: 1 } })
  // @ts-expect-error body is required
  api.users.post()
  // @ts-expect-error name must be a string
  api.users.post({ body: { name: 1 } })
  // @ts-expect-error unknown body key
  api.users.post({ body: { name: 'a', nope: true } })

  // defineRouteType query is checked
  api.search.get({ query: { q: 'x' } })
  // @ts-expect-error q must be a string
  api.search.get({ query: { q: 1 } })
  // @ts-expect-error unknown query key
  api.search.get({ query: { q: 'x', nope: '1' } })

  // params accept strings and numbers only
  api.users.id(1).get()
  api.users.id('1').get()
  // @ts-expect-error objects are not params
  api.users.id({}).get()

  // methods that don't exist are not exposed
  // @ts-expect-error no DELETE handler for /api/users
  const _noDelete = api.users.delete
  // method-less handlers get every method
  api.health.put()

  // internal and non-api routes are not exposed
  // @ts-expect-error _internal is skipped
  const _noInternal = api._internal
  // @ts-expect-error server/routes are not under /api
  const _noHello = api.hello

  // fetch options pass through
  api.health.get({ headers: { 'x-a': '1' }, retry: 2, onResponse: () => {} })
  // @ts-expect-error method is fixed by the SDK
  api.health.get({ method: 'POST' })
}
