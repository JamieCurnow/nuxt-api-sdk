export type ApiFetch = (request: string, opts?: unknown) => Promise<unknown>
export const _useApi = (opts: { fetch: ApiFetch }) => opts
