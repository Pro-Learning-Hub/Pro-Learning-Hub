import type { RootState } from '@/store/store'

export function getCachedQueryData<T>(
  state: RootState,
  endpointName: string,
  originalArgs?: unknown,
): T | undefined {
  const queries = state.api.queries as Record<
    string,
    { endpointName?: string; originalArgs?: unknown; data?: T }
  >
  return Object.values(queries).find((entry) => {
    if (entry?.endpointName !== endpointName) {
      return false
    }
    if (originalArgs === undefined) {
      return entry.originalArgs === undefined
    }
    return entry.originalArgs === originalArgs
  })?.data
}

export function isNotModified(result: {
  error?: { status?: unknown; originalStatus?: number }
}): boolean {
  const status = result.error?.status
  if (status === 304) {
    return true
  }
  return status === 'PARSING_ERROR' && result.error?.originalStatus === 304
}
