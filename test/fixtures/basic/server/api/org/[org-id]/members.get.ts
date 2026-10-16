export default defineEventHandler((event) => ({ org: getRouterParam(event, 'org-id', { decode: true }) }))
