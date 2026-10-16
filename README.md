# Nuxt API SDK

🚧 **This module is under active development and may be subject to breaking changes.** 🚧

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Tired of manually typing your API routes? Say goodbye to string-based API calls and hello to a fully-typed SDK, automatically generated from your Nuxt server routes!

This module introspects your `server/api` directory and creates a chainable, fully-typed SDK that you can use anywhere in your Nuxt app.

Instead of this:

```typescript
await $fetch(`/api/user/${uid}`, { method: 'get' })
```

You can now do this, with full autocompletion and type-safety:

```typescript
await useApi().user.uid(uid).get()
```

## Features

- ✅ &nbsp;**Zero-config:** Drop it in and it just works.
- 🤖 &nbsp;**Automatic SDK Generation:** Your `useApi()` composable is always in sync with your API routes.
- 🦾 &nbsp;**End-to-end Type-Safety:** Full type inference for route parameters and request bodies.
- ⛓️ &nbsp;**Chainable API:** A fluent, easy-to-read API for interacting with your server.
- 🔀 &nbsp;**Dynamic Routes:** Handles route parameters (`[uid]`) and catch-alls (`[...slug]`), URL-encoded for you.
- 🧭 &nbsp;**Route-typed fetch:** Uses Nuxt 4.6's `experimental.routeTypedFetch` types when you turn it on.

## Quick Setup

Install the module to your Nuxt application with one command:

```bash
npx nuxi module add nuxt-api-sdk
```

That's it! You can now use the `useApi()` composable in your Nuxt app ✨

## Usage

### 1. Create your API routes

Create your API endpoints in the `server/api` directory as you normally would.

`server/api/user/[uid].get.ts`

```typescript
export default defineEventHandler(async (event) => {
  const uid = getRouterParam(event, 'uid')
  // ... your logic here
})
```

### 2. Add types to your routes (optional)

Response types are inferred from your handlers automatically.

#### With `experimental.routeTypedFetch` (Nuxt 4.6+)

If you've turned on Nuxt's route-typed fetch, the SDK uses the same types as Nuxt's `$fetch`, so a body or query you declare on the handler is typed (and a required body is required) with nothing extra:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-api-sdk'],
  experimental: {
    routeTypedFetch: true
  }
})
```

`server/api/user/[uid]/index.patch.ts`

```typescript
export default defineEventHandler<{ body: Partial<User>; query: { notify?: 'yes' | 'no' } }>(
  async (event) => {
    // ...
  }
)
```

```typescript
await useApi()
  .user.uid(uid)
  .patch({ body: { name: 'Jamie' }, query: { notify: 'yes' } })
```

#### With `defineRouteType` (any Nuxt 4 version)

You can also export a `body` and/or `query` type from your route handler file using the `defineRouteType` helper. These take priority over the route-typed ones when both are present.

`server/api/user/index.post.ts`

```typescript
import type { User } from '~/shared/types/User'

type Body = Omit<User, 'uid'>
export const body = defineRouteType<Body>() // <-- This defines the type for the request body
// export const query = defineRouteType<{ notify?: string }>() // <-- and this the query

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)
  // ... your logic here
})
```

### 3. Use the SDK

Now you can use the `useApi()` composable in your components and pages. The SDK is automatically generated and will mirror your API structure.

```vue
<script setup lang="ts">
const user = ref(null)
const userUid = ref('some-user-id')

// GET /api/user/:uid
user.value = await useApi().user.uid(userUid.value).get()

// POST /api/user
const newUser = await useApi().user.post({
  body: {
    email: 'some@email.com',
    name: 'some name'
  }
})
</script>
```

The SDK will automatically update as you add, remove, or modify your API routes. Happy coding!

### How routes map to the SDK

| File                                     | SDK call                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| `server/api/user/index.post.ts`          | `useApi().user.post()`                                                    |
| `server/api/user/[uid]/index.get.ts`     | `useApi().user.uid(uid).get()`                                            |
| `server/api/org/[org-id]/members.get.ts` | `useApi().org.orgId(id).members.get()`                                    |
| `server/api/docs/[...slug].get.ts`       | `useApi().docs.slug('a/b').get()`                                         |
| `server/api/blog/[...].ts`               | `useApi().blog.catchAll('a/b').get()`                                     |
| `server/api/health.ts` (no method)       | `useApi().health.get()` / `.post()` / `.put()` / `.patch()` / `.delete()` |

Segments are camelCased (`my-route` becomes `myRoute`). Only routes under `server/api` are included; `server/routes` and routes starting with `_` are skipped.

## Advanced Usage

### Bring Your Own Fetch

By default, the SDK uses Nuxt's `useRequestFetch()`, so calls made during SSR go straight to your server handlers and forward the incoming request's headers and cookies (falling back to the global `$fetch` outside a Nuxt context). If you want to use a custom fetch implementation, you can provide your own fetch function when calling the `useApi()` composable, as long as it has the same function signature as `$fetch`.

Example:

```typescript
import { $fetch } from 'ofetch'

const myfetch = $fetch.create({
  baseURL: 'https://api.example.com',
  headers: {
    Authorization: 'Bearer my-token'
  }
})

const api = useApi({ fetch: myfetch })

await api.user.uid(userUid.value).get()
```

## Contribution

<details>
  <summary>Local development</summary>
  
  ```bash
  # Install dependencies
  npm install
  
  # Generate type stubs
  npm run dev:prepare
  
  # Develop with the playground
  npm run dev
  
  # Build the playground
  npm run dev:build
  
  # Run ESLint
  npm run lint
  
  # Run Vitest
  npm run test
  npm run test:watch
  
  # Release new version
  npm run release
  ```

</details>

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/nuxt-api-sdk/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-api-sdk
[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-api-sdk.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/nuxt-api-sdk
[license-src]: https://img.shields.io/npm/l/nuxt-api-sdk.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-api-sdk
[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
