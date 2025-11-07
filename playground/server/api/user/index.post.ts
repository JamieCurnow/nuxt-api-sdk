import { randomUUID } from 'node:crypto'
import { mockdb } from '../../utils/db'
import type { User } from '~/shared/types/User'

type Body = Omit<User, 'uid'>
export const body = defineRouteType<Body>()
// TODO: Can we use defineRouteMeta?
// defineRouteMeta({})

export default defineEventHandler(async (event) => {
  const body = await readBody<Body | undefined>(event)

  if (!body) throw createError({ statusCode: 400, statusMessage: 'Invalid body' })

  const uid = randomUUID()
  const user: User = {
    ...body,
    uid
  }

  mockdb.users[uid] = user

  return user
})
