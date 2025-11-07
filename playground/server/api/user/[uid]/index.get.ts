export default defineEventHandler((event) => {
  const uid = getRouterParam(event, 'uid')

  if (!uid) throw createError({ statusCode: 400, statusMessage: 'No uid route param found' })

  const user = mockdb.users[uid]

  if (!user) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  return user
})
