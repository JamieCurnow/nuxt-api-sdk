<template>
  <div>
    <div>basic</div>
    <div id="health">{{ health.ok }}</div>
    <div id="org">{{ org.org }}</div>
    <div id="slug">{{ docs.slug }}</div>
    <div id="echo">{{ echo.method }} {{ echo.body.name }} {{ echo.query.page }}</div>
  </div>
</template>

<script setup lang="ts">
const api = useApi()
const health = await api.health.get()
const org = await api.org.orgId('a b').members.get()
const docs = await api.docs.slug('one/two').get()
const echo = await api.echo.post({ body: { name: 'jamie' }, query: { page: '2' } })
</script>
