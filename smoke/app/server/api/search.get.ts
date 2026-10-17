export const query = defineRouteType<{ q: string; limit?: string }>()
export default defineEventHandler((event) => {
  const q = getQuery(event) as { q: string; limit?: string }
  return { q: q.q, limit: Number(q.limit ?? 10) }
})
