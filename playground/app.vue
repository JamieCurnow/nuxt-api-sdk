<template>
  <div>
    <div>
      <input v-model="email" placeholder="Email" />
      <input v-model="name" placeholder="name" />
      <button @click="save">Save</button>
    </div>
    <div>
      <input v-model="userUid" placeholder="userUid" />
      <button @click="get">Get</button>
    </div>
    <div v-if="user">user: {{ JSON.stringify(user) }}</div>
  </div>
</template>

<script setup lang="ts">
const email = ref('')
const name = ref('')
const userUid = ref('')
const user = ref<User | null>(null)

const save = async () => {
  const { uid } = await useApi().user.post({
    body: {
      email: email.value,
      name: name.value
    }
  })
  userUid.value = uid
}

const get = async () => {
  user.value = await useApi().user.uid(userUid.value).get()
}
</script>
