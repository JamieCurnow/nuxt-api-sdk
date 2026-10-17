<script setup lang="ts">
// Exercises every SDK feature. smoke/check.mjs reads the three <pre> blocks and compares them to what it expects.
const api = useApi()

// --- SSR (rendered on the server, then hydrated from the payload)
const { data: ssr } = await useAsyncData('ssr', async () => {
  const boom = await api.boom.get().then(
    () => 'no error',
    (e: { statusCode?: number }) => e.statusCode
  )
  // server/api/live/ping.post.ts only exists while run.sh tests dev regeneration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const live = (api as Record<string, any>).live
  return {
    health: await api.health.get(),
    healthDelete: await api.health.delete(),
    users: await api.users.get(),
    created: await api.users.post({ body: { name: 'grace', age: 36 } }),
    user: await api.users.id(42).get(),
    patched: await api.users.id('a b').patch({ body: { name: 'new' }, query: { notify: 'yes' } }),
    members: await api.org.orgId('acme inc/uk').members.get(),
    docs: await api.docs.slug('guide/getting started').get(),
    search: await api.search.get({ query: { q: 'nuxt', limit: '5' } }),
    whoami: await api.whoami.get(),
    boom,
    live: live ? await live.ping.post({ body: { n: 41 } }) : null
  }
})

// --- custom fetch
const calls: string[] = []
const custom = useApi({
  fetch: async (url, opts) => {
    calls.push(`${opts.method} ${url}`)
    return 'custom'
  }
})
const { data: customResult } = await useAsyncData('custom', async () => ({
  result: await custom.users.id(7).get(),
  calls: [...calls]
}))

// --- client only (runs in the browser after hydration)
const client = ref<unknown>(null)
onMounted(async () => {
  client.value = {
    created: await api.users.post({ body: { name: 'client' } }),
    patched: await api.users.id('c/d').patch({ body: { name: 'from-client' } }),
    docs: await api.docs.slug('x/y z').get(),
    whoami: await api.whoami.get(),
    search: await api.search.get({ query: { q: 'browser' } })
  }
})
</script>

<template>
  <div>
    <pre id="ssr">{{ JSON.stringify(ssr) }}</pre>
    <pre id="custom">{{ JSON.stringify(customResult) }}</pre>
    <pre id="client">{{ JSON.stringify(client) }}</pre>
  </div>
</template>
