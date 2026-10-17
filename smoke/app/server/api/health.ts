export default defineEventHandler((event) => ({ ok: true, method: String(event.method) }))
