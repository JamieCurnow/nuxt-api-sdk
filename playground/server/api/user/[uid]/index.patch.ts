import type { User } from '~~/shared/types/User'

// Typed with h3's request generic, which Nuxt's route-typed fetch picks up
export default defineEventHandler<{ body: Partial<Omit<User, 'uid'>>; query: { notify?: 'yes' | 'no' } }>(
  async (event) => {
    const uid = getRouterParam(event, 'uid')!
    const user = mockdb.users[uid]
    if (!user) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
    const body = await readBody(event)
    mockdb.users[uid] = { ...user, ...body }
    return mockdb.users[uid]
  }
)
