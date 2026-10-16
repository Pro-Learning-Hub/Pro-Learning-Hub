import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { REHYDRATE } from 'redux-persist'
import { logout } from '@/store/slices/authSlice'
import { clearSync } from '@/store/slices/syncSlice'

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  credentials: 'include',
  validateStatus: (response) =>
    response.status === 304 || (response.status >= 200 && response.status < 300),
})

export const api = createApi({
  reducerPath: 'api',
  extractRehydrationInfo(action, { reducerPath }) {
    if (action.type === REHYDRATE) {
      const persistAction = action as { key?: string; payload?: any }
      if (persistAction.key === 'api') {
        return persistAction.payload
      }
      return persistAction.payload?.[reducerPath]
    }
  },
  baseQuery: async (args, apiCtx, extra) => {
    const result = await rawBaseQuery(args, apiCtx, extra)
    if (result.error && result.error.status === 401) {
      apiCtx.dispatch(api.util.resetApiState())
      apiCtx.dispatch(clearSync())
      apiCtx.dispatch(logout())
    }
    return result
  },
  refetchOnMountOrArgChange: true,
  keepUnusedDataFor: 60 * 60 * 24,
  tagTypes: ['Sections', 'Lecture', 'Announcements', 'Discussion', 'Replies'],
  endpoints: () => ({}),
})
