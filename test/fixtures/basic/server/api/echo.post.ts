export default defineEventHandler(async (event) => ({
  method: event.method,
  body: await readBody(event),
  query: getQuery(event)
}))
