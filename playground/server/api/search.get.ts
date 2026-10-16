// The module's own way of typing a query, for when routeTypedFetch is off
export const query = defineRouteType<{ q: string }>()

export default defineEventHandler((event) => ({ q: getQuery(event).q as string }))
