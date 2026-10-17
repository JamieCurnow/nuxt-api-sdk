// Type tests that only hold with experimental.routeTypedFetch (legacy mode can't read h3 generics)
const api = useApi()

export const run = async () => {
  // h3-typed body + query
  await api.user.uid('x').patch({ body: { name: 'x' }, query: { notify: 'yes' } })
  // @ts-expect-error wrong body field type
  await api.user.uid('x').patch({ body: { name: 1 } })
  // @ts-expect-error wrong query value
  await api.user.uid('x').patch({ body: {}, query: { notify: 'maybe' } })
  // @ts-expect-error body is required
  await api.user.uid('x').patch()
}
