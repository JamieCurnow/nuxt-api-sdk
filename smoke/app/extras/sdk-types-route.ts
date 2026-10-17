// Only true with experimental.routeTypedFetch: h3 generics type body and query
export function routeChecks() {
  const api = useApi()
  api.users.id(1).patch({ body: { name: 'x' }, query: { notify: 'y' } })
  // @ts-expect-error body is required by the h3 generic
  api.users.id(1).patch()
  // @ts-expect-error name must be a string
  api.users.id(1).patch({ body: { name: 1 } })
  // @ts-expect-error unknown query key
  api.users.id(1).patch({ body: { name: 'x' }, query: { nope: '1' } })
  type P = Awaited<ReturnType<ReturnType<typeof api.users.id>['patch']>>
  const p: P = { id: '1', name: 'x', notify: null }
  return p
}
