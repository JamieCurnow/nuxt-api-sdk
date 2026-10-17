// Checks the smoke app's rendered output against what the SDK should return.
// Usage: node check.mjs <url> [--browser] [--live]
//   --browser  also load the page in Chrome and check the client-side calls
//   --live     expect the route run.sh adds while `nuxt dev` is running
import { deepStrictEqual } from 'node:assert/strict'

const [url, ...flags] = process.argv.slice(2)
const live = flags.includes('--live')

const read = (html, id) => {
  const match = html.match(new RegExp(`<pre id="${id}">(.*?)</pre>`, 's'))
  if (!match) throw new Error(`#${id} not found in the page`)
  const text = match[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  return JSON.parse(text)
}

// --- SSR: the cookie checks that useApi forwards request headers to the API during SSR
const html = await (await fetch(url, { headers: { cookie: 'user=jamie' } })).text()
deepStrictEqual(read(html, 'ssr'), {
  health: { ok: true, method: 'GET' },
  healthDelete: { ok: true, method: 'DELETE' },
  users: [{ id: 1, name: 'ada' }],
  created: { created: 'grace', age: 36 },
  user: { id: '42', name: 'ada' },
  patched: { id: 'a b', name: 'new', notify: 'yes' },
  members: { org: 'acme inc/uk' },
  docs: { slug: 'guide/getting started' },
  search: { q: 'nuxt', limit: 5 },
  whoami: { user: 'jamie' },
  boom: 418,
  live: live ? { pong: 42 } : null
})
deepStrictEqual(read(html, 'custom'), { result: 'custom', calls: ['GET /api/users/7'] })
deepStrictEqual(read(html, 'client'), null)
console.log(live ? '  ✔ ssr, with the route added in dev' : '  ✔ ssr')

// --- browser: client-side calls after hydration, and SSR calls are not repeated
if (flags.includes('--browser')) {
  const { chromium } = await import('playwright-core')
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const context = await browser.newContext()
    await context.addCookies([{ name: 'user', value: 'jamie', url }])
    const page = await context.newPage()
    const errors = []
    const requests = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('request', (r) => {
      const { pathname, search } = new URL(r.url())
      if (pathname.startsWith('/api/')) requests.push(`${r.method()} ${pathname}${search}`)
    })
    await page.goto(url)
    await page.waitForFunction(() => document.querySelector('#client')?.textContent !== 'null', null, { timeout: 15000 })

    deepStrictEqual(JSON.parse(await page.textContent('#client')), {
      created: { created: 'client', age: null },
      patched: { id: 'c/d', name: 'from-client', notify: null },
      docs: { slug: 'x/y z' },
      whoami: { user: 'jamie' },
      search: { q: 'browser', limit: 10 }
    })
    deepStrictEqual(requests, [
      'POST /api/users',
      'PATCH /api/users/c%2Fd',
      'GET /api/docs/x/y%20z',
      'GET /api/whoami',
      'GET /api/search?q=browser'
    ])
    deepStrictEqual(errors, [])
    console.log('  ✔ browser')
  } finally {
    await browser.close()
  }
}
