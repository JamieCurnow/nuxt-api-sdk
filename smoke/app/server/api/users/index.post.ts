export const body = defineRouteType<{ name: string; age?: number }>()
export default defineEventHandler(async (event) => {
  const b = await readBody<{ name: string; age?: number }>(event)
  return { created: b.name, age: b.age ?? null }
})
