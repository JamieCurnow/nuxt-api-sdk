export default defineEventHandler((event) => ({ user: getCookie(event, 'user') ?? null }))
