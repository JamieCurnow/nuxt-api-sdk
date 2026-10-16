export default defineEventHandler((event) => ({ slug: getRouterParam(event, 'slug', { decode: true }) }))
