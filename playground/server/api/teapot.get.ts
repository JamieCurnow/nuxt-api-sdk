// a handler that only throws has a `never` response type
export default defineEventHandler(() => {
  throw createError({ statusCode: 418 })
})
