# Testing

Run `npm run dev:prepare` once after installing, then:

| Command              | What it checks                                                                                              | Time   |
| -------------------- | ----------------------------------------------------------------------------------------------------------- | ------ |
| `npm run lint`       | ESLint                                                                                                      | ~5s    |
| `npm run test`       | Vitest unit tests (100% coverage enforced) then e2e tests against `test/fixtures/basic` in both fetch modes | ~30s   |
| `npm run test:types` | Type-checks the module, then the playground's SDK type assertions with `routeTypedFetch` off and on         | ~30s   |
| `npm run test:smoke` | The packed module in a fresh Nuxt app, end to end, in both fetch modes (see below)                          | ~45s   |

CI runs lint, test and test:types on every PR, and again before publishing a release.

## Unit and e2e tests (`test/`)

- `test/unit/generateSdk.test.ts` compiles the generated SDK and calls it with a mocked fetch, so it checks the URLs, methods and options each SDK method sends.
- `test/unit/module.test.ts` and `test/unit/runtime.test.ts` cover the module setup and the `useApi` / `defineRouteType` runtime.
- `test/e2e/` boots `test/fixtures/basic` with `@nuxt/test-utils` and checks SSR, once per fetch mode.

## Type tests (`playground/`)

The playground has `routeTypedFetch` on by default. `LEGACY_FETCH=1` turns it off.

- `playground/sdk-types.ts` holds assertions that hold in both modes.
- `playground/sdk-types.route.ts` holds assertions that need route-typed fetch (h3 generic bodies and queries). `tsconfig.legacy.json` excludes it for the legacy run.

Add a playground route and an assertion here whenever a change affects the generated types.

## Smoke test (`smoke/`)

`smoke/app` is a standalone Nuxt app in strict TypeScript mode that uses every feature: static, `[param]`, `[kebab-param]` and `[...slug]` routes, method-less handlers, `defineRouteType` body and query, h3 generics, a route that only throws, a custom `fetch`, cookie forwarding during SSR, and internal (`_internal`) and non-`/api` routes that must stay out of the SDK.

`smoke/run.sh` copies it to a temp dir, installs the module, and then:

1. For `routeTypedFetch` off and on: runs `vue-tsc` (with `app/sdk-types.ts`, plus `extras/sdk-types-route.ts` in route mode), runs a production build, serves it, and runs `smoke/check.mjs`. That checks the SSR output (including the forwarded cookie), then loads the page in Chrome to check client-side calls, the requests sent and the console errors.
2. Starts `nuxt dev`, adds `server/api/live/ping.post.ts`, and checks the SDK picks the route up without a restart.

```sh
npm run test:smoke             # the module built from this repo
npm run test:smoke -- 0.1.1    # a version published to npm
SMOKE_BROWSER=0 npm run test:smoke   # skip the Chrome checks
SMOKE_KEEP=1 npm run test:smoke      # keep the temp app to poke around in
```

It needs Google Chrome installed for the browser step. Run it before a release, and against the published version straight after one.

## Releasing

`npm run release` runs the checks, bumps the version with changelogen, writes `CHANGELOG.md`, tags and pushes. Pushing the `v*` tag triggers `.github/workflows/release.yml`, which runs the checks again, publishes to npm with trusted publishing (no token or 2FA needed) and creates the GitHub release. Then run `npm run test:smoke -- <version>` to check the published package.
