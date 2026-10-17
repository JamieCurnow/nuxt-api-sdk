// h3 generics: picked up by nuxt route-typed fetch, not by legacy mode
export default defineEventHandler<{ body: { name: string }; query: { notify?: string } }>(async (event) => {
  const b = await readBody(event)
  return { id: getRouterParam(event, 'id', { decode: true })!, name: b.name, notify: getQuery(event).notify ?? null }
})
