export default defineEventHandler(() => {
  throw createError({ statusCode: 418, statusMessage: 'teapot' })
})
