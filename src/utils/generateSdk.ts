// import { writeFile, mkdir } from 'node:fs/promises'
// import { dirname } from 'node:path'
import type { NitroEventHandler } from 'nitropack'

const toCamelCase = (str: string) => {
  return str.replace(/-([a-z])/g, (g) => (g?.[1] || '').toUpperCase())
}

export const generateSdk = (types: NitroEventHandler[]) => {
  const content = [
    "import { $fetch as _$fetch, type FetchOptions } from 'ofetch'",
    `import type { InternalApi } from 'nitropack/types'`,
    '',
    `type GetBody<T> = T extends { body: infer B } ? { body: B } : { body: FetchOptions['body'] }`,
    '',
    'export const _useApi = (_apiOpts?: { fetch: typeof _$fetch }) => {',
    '  const $fetch = _apiOpts?.fetch || _$fetch',
    '  return {'
  ]

  // TODO: type this up
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sdkObject: any = {}

  for (const handler of types) {
    const { handler: filePath, route: path, method } = handler
    // Skip internal API routes
    console.log(path)
    if (!path || !filePath || !method) continue
    if (path.startsWith('/_')) continue
    const parts = path.split('/').filter(Boolean)
    // pop the first /api part
    parts.shift()
    let current = sdkObject

    for (let i = 0; i < parts.length; i++) {
      let part = parts[i]
      if (!part) continue
      const isParam = part.startsWith(':')
      if (isParam) {
        part = part.replace(':', '')
        if (!current._params) {
          current._params = []
        }
        current._params.push({ name: part, index: i })
        // Create a new level for the parameter
        if (!current[part]) {
          current[part] = {}
        }
        current = current[part]
      } else {
        const key = toCamelCase(part)
        if (!current[key]) {
          current[key] = {}
        }
        current = current[key]
      }
    }

    const methods = { [method]: filePath }

    current._methods = { ...(current._methods || {}), ...methods }
    current._path = path
  }

  const generateCode = (
    // TODO: type this up
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    obj: any,
    level = 2,
    parentParams: { name: string; key: string; functionKeys: string[] }[] = []
  ): string[] => {
    const lines: string[] = []
    const indent = '  '.repeat(level)

    const keys = Object.keys(obj).filter((k) => !k.startsWith('_'))
    const params = obj._params || []

    if (params.length > 0) {
      const param = params[0]
      const paramName = param.name
        ? toCamelCase(param.name) + (parentParams.length || '')
        : 'undefinedParamName'
      const newParentParams = [...parentParams, { name: paramName, key: param.name, functionKeys: keys }]
      const paramKeys = keys.filter((k) => k === param.name)
      const otherKeys = keys.filter((k) => k !== param.name)

      if (paramKeys.length > 0 && paramKeys[0]) {
        const child = obj[paramKeys[0]]
        lines.push(`${indent}${param.name}: (${paramName}: string) => ({`)
        lines.push(...generateCode(child, level + 1, newParentParams))
        lines.push(`${indent}}),`)
      }

      for (const key of otherKeys) {
        const child = obj[key]
        lines.push(`${indent}${key}: {`)
        lines.push(...generateCode(child, level + 1, parentParams))
        lines.push(`${indent}},`)
      }
    } else {
      for (const key of keys) {
        const child = obj[key]
        lines.push(`${indent}${key}: {`)
        lines.push(...generateCode(child, level + 1, parentParams))
        lines.push(`${indent}},`)
      }
    }

    if (obj._methods) {
      const pathWithParams = obj._path
      // TODO: type this up
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
      for (const [method, filePath] of Object.entries(obj._methods) as any) {
        let finalPath = pathWithParams
        if (parentParams.length) {
          for (const p of parentParams) {
            finalPath = finalPath.replace(`:${p.key}`, `\${${p.name}}`)
          }
        }

        const returnType = `Promise<InternalApi['${pathWithParams}']['${method}']>`
        let opts = `opts?: Omit<FetchOptions, 'method'>`
        if (method !== 'get') {
          opts = `\n${indent}  opts?: Omit<FetchOptions, 'method' | 'body'> & GetBody<typeof import('${filePath}')>\n${indent}`
        }
        lines.push(`${indent}${method}: async (${opts}): ${returnType} => {`)
        lines.push(
          `${indent}  return $fetch(\`${finalPath}\`, { ...(opts || {}), method: '${method.toUpperCase()}', responseType: 'json' })`
        )
        lines.push(`${indent}},`)
      }
    }

    // remove trailing commas
    if (lines[lines.length - 1]?.trim().endsWith(',')) {
      const lastLine = lines[lines.length - 1]
      if (lastLine) {
        lines[lines.length - 1] = lastLine.slice(0, lastLine.lastIndexOf(','))
      }
    }
    return lines
  }

  content.push(...generateCode(sdkObject))
  content.push('  }')
  content.push('}')
  content.push('')

  return content.join('\n')
}

// const types = {
//   '/api/chat/:uid': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/chat/[uid]/index.get').default>>>>"
//     ]
//   },
//   '/api/chat/:uid/reviews/:uid': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/chat/[uid]/index.get').default>>>>"
//     ]
//   },
//   '/api/chat': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/chat/index.get').default>>>>"
//     ]
//   },
//   '/api/company/:uid': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/company/[uid]/index.get').default>>>>"
//     ],
//     patch: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/company/[uid]/index.patch').default>>>>"
//     ]
//   },
//   '/api/company': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/company/index.get').default>>>>"
//     ],
//     post: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/company/index.post').default>>>>"
//     ]
//   },
//   '/api/hire/:uid': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/hire/[uid]/index.get').default>>>>"
//     ],
//     patch: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/hire/[uid]/index.patch').default>>>>"
//     ]
//   },
//   '/api/hire': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/hire/index.get').default>>>>"
//     ],
//     post: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/hire/index.post').default>>>>"
//     ]
//   },
//   '/api/invoice/:uid': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/invoice/[uid]/index.get').default>>>>"
//     ]
//   },
//   '/api/invoice': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/invoice/index.get').default>>>>"
//     ],
//     post: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/invoice/index.post').default>>>>"
//     ]
//   },
//   '/api/job/:uid': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/job/[uid]/index.get').default>>>>"
//     ],
//     patch: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/job/[uid]/index.patch').default>>>>"
//     ]
//   },
//   '/api/job': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/job/index.get').default>>>>"
//     ],
//     post: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/job/index.post').default>>>>"
//     ]
//   },
//   '/api/message': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/message/index.get').default>>>>"
//     ],
//     post: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/message/index.post').default>>>>"
//     ]
//   },
//   '/api/notification/:uid': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/notification/[uid]/index.get').default>>>>"
//     ],
//     patch: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/notification/[uid]/index.patch').default>>>>"
//     ]
//   },
//   '/api/notification': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/notification/index.get').default>>>>"
//     ],
//     post: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/notification/index.post').default>>>>"
//     ]
//   },
//   '/api/pioneer/:uid': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/pioneer/[uid]/index.get').default>>>>"
//     ],
//     patch: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/pioneer/[uid]/index.patch').default>>>>"
//     ]
//   },
//   '/api/pioneer': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/pioneer/index.get').default>>>>"
//     ],
//     post: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/pioneer/index.post').default>>>>"
//     ]
//   },
//   '/api/review/:uid': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/review/[uid]/index.get').default>>>>"
//     ]
//   },
//   '/api/review': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/review/index.get').default>>>>"
//     ],
//     post: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/review/index.post').default>>>>"
//     ]
//   },
//   '/api/test/companies-house': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/test/companies-house/index.get').default>>>>"
//     ]
//   },
//   '/api/test': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/test/index.get').default>>>>"
//     ]
//   },
//   '/api/test/query': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/test/query.get').default>>>>"
//     ]
//   },
//   '/api/upload/image': {
//     post: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/upload/image.post').default>>>>"
//     ]
//   },
//   '/api/user/:uid': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/user/[uid]/index.get').default>>>>"
//     ],
//     patch: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/user/[uid]/index.patch').default>>>>"
//     ],
//     post: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/user/[uid]/index.post').default>>>>"
//     ]
//   },
//   '/api/user': {
//     get: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../server/api/user/index.get').default>>>>"
//     ]
//   },
//   '/__nuxt_error': {
//     default: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../node_modules/nuxt/dist/core/runtime/nitro/handlers/renderer').default>>>>"
//     ]
//   },
//   '/api/_nuxt_icon/:collection': {
//     default: [
//       "Simplify<Serialize<Awaited<ReturnType<typeof import('../../../node_modules/@nuxt/icon/dist/runtime/server/api').default>>>>"
//     ]
//   }
// }

// const test = async () => {
//   const outputPath = './modules/sdk/generated/sdk.ts'
//   const outputDir = dirname(outputPath)
//   await mkdir(outputDir, { recursive: true })
//   await writeFile(outputPath, await generateSdk())
// }
// test()
