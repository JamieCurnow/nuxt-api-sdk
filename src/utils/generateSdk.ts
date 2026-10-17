import type { NitroEventHandler } from 'nitropack'

export interface GenerateSdkOptions {
  /**
   * The base URL nitro serves `server/api` from (`nitro.options.apiBaseURL`).
   * @default '/api'
   */
  apiBaseURL?: string
  /**
   * Type requests and responses with Nuxt's route-typed fetch helpers
   * (`experimental.routeTypedFetch`, Nuxt 4.6+) instead of nitro's `InternalApi`.
   */
  routeTypedFetch?: boolean
}

/** Methods a handler registered without a method suffix (e.g. `hello.ts`) is exposed under. */
const DEFAULT_METHODS = ['get', 'post', 'put', 'patch', 'delete']

interface RouteMethod {
  /** The nitro route pattern, e.g. `/api/user/:uid` */
  route: string
  /** The handler file, used to read the `body`/`query` types it exports */
  filePath: string
  /** The method key in nitro's `InternalApi` (`default` for handlers without a method) */
  internalMethod: string
}

interface SdkNode {
  /** The URL segment this node was created for */
  segment: string
  children: Record<string, SdkNode>
  /** A dynamic segment (`:uid`) or catch-all (`**`, `**:slug`) below this node */
  param?: { name: string; wildcard: boolean; node: SdkNode }
  methods: Record<string, RouteMethod>
}

const createNode = (segment = ''): SdkNode => ({ segment, children: {}, methods: {} })

const toCamelCase = (str: string) => {
  return str.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())
}

const toIdentifier = (str: string) => {
  const id = toCamelCase(str).replace(/[^\w$]/g, '_')
  return /^\d/.test(id) ? `_${id}` : id || '_'
}

const VALID_KEY_RE = /^[A-Z_$][\w$]*$/i
const toKey = (str: string) => (VALID_KEY_RE.test(str) ? str : JSON.stringify(str))

const escapeTemplate = (str: string) => str.replace(/[`\\]|\$\{/g, (c) => `\\${c}`)

export const generateSdk = (handlers: NitroEventHandler[], opts: GenerateSdkOptions = {}) => {
  const apiBaseURL = `/${(opts.apiBaseURL || '/api').replace(/^\/+|\/+$/g, '')}`
  const root = createNode()

  for (const handler of handlers) {
    const { handler: filePath, route } = handler
    if (!route || !filePath || handler.middleware) continue
    // only routes served from server/api
    if (route !== apiBaseURL && !route.startsWith(`${apiBaseURL}/`)) continue

    const parts = route.slice(apiBaseURL.length).split('/').filter(Boolean)
    // skip internal routes (e.g. /api/_nuxt_icon)
    if (parts.some((part) => part.startsWith('_'))) continue

    let current = root
    for (const part of parts) {
      const wildcard = part.startsWith('**')
      if (wildcard || part.startsWith(':')) {
        const name = wildcard ? part.slice(3) || 'catchAll' : part.slice(1)
        current.param ||= { name, wildcard, node: createNode(part) }
        current = current.param.node
      } else {
        const key = toCamelCase(part)
        current = current.children[key] ||= createNode(part)
      }
    }

    const method = handler.method?.toLowerCase()
    for (const m of method ? [method] : DEFAULT_METHODS) {
      // a handler for a specific method wins over a method-less one
      if (!method && current.methods[m]) continue
      current.methods[m] = { route, filePath, internalMethod: method || 'default' }
    }
  }

  const content = [
    opts.routeTypedFetch
      ? `import type { AnyServerRouteMethod, TypedFetchOptions, TypedServerResponse } from 'nuxt/app'`
      : `import type { InternalApi } from 'nitropack/types'\nimport type { FetchOptions } from 'ofetch'`,
    '',
    '// eslint-disable-next-line @typescript-eslint/no-explicit-any',
    'export type ApiFetch = (request: string, opts?: any) => Promise<any>',
    '',
    '/** The `body` and `query` types a handler exports with `defineRouteType` */',
    `type Exported<Mod> = (Mod extends { body: infer B } ? { body: B } : unknown) & (Mod extends { query: infer Q } ? { query?: Q } : unknown)`,
    `type ExportedKeys<Mod> = (Mod extends { body: unknown } ? 'body' : never) | (Mod extends { query: unknown } ? 'query' : never)`,
    '/** Makes the options argument required when it has required keys (e.g. a required body) */',
    `type Args<O> = {} extends O ? [opts?: O] : [opts: O]`,
    ''
  ]

  if (opts.routeTypedFetch) {
    content.push(
      `type Opts<Path extends string, Method extends AnyServerRouteMethod, Mod> = Omit<TypedFetchOptions<Path, Method>, 'method' | ExportedKeys<Mod>> & Exported<Mod>`
    )
  } else {
    content.push(
      `type Opts<_Path extends string, _Method extends string, Mod> = Omit<FetchOptions<'json'>, 'method' | ExportedKeys<Mod>> & Exported<Mod>`
    )
  }

  content.push(
    '',
    'export const _useApi = (_apiOpts?: { fetch?: ApiFetch }) => {',
    '  // generic so each method infers its own response type, including `never` for handlers that only throw',
    '  // eslint-disable-next-line @typescript-eslint/no-explicit-any',
    '  const $fetch = (_apiOpts?.fetch || globalThis.$fetch) as <T>(request: string, opts?: any) => Promise<T>',
    '  return {'
  )

  const generateCode = (node: SdkNode, level: number, urlParts: string[], scope: string[]): string[] => {
    const lines: string[] = []
    const indent = '  '.repeat(level)

    for (const [key, child] of Object.entries(node.children)) {
      lines.push(`${indent}${toKey(key)}: {`)
      lines.push(...generateCode(child, level + 1, [...urlParts, escapeTemplate(child.segment)], scope))
      lines.push(`${indent}},`)
    }

    if (node.param) {
      const { name, wildcard, node: child } = node.param
      let varName = toIdentifier(name)
      while (scope.includes(varName)) varName += scope.length
      const encode = wildcard
        ? `\${String(${varName}).split('/').map(encodeURIComponent).join('/')}`
        : `\${encodeURIComponent(${varName})}`
      lines.push(`${indent}${toKey(toIdentifier(name))}: (${varName}: string | number) => ({`)
      lines.push(...generateCode(child, level + 1, [...urlParts, encode], [...scope, varName]))
      lines.push(`${indent}}),`)
    }

    for (const [method, { route, filePath, internalMethod }] of Object.entries(node.methods)) {
      const mod = `typeof import(${JSON.stringify(filePath)})`
      const returnType = opts.routeTypedFetch
        ? `TypedServerResponse<${JSON.stringify(route)}, unknown, '${method}'>`
        : `InternalApi[${JSON.stringify(route)}]['${internalMethod}']`
      const url = `\`${apiBaseURL}${urlParts.map((p) => `/${p}`).join('')}\``
      lines.push(
        `${indent}${method}: (...[opts]: Args<Opts<${JSON.stringify(route)}, '${method}', ${mod}>>): Promise<${returnType}> => {`
      )
      lines.push(`${indent}  return $fetch(${url}, { responseType: 'json', ...opts, method: '${method.toUpperCase()}' })`)
      lines.push(`${indent}},`)
    }

    return lines
  }

  content.push(...generateCode(root, 2, [], []))
  content.push('  }')
  content.push('}')
  content.push('')

  return content.join('\n')
}
