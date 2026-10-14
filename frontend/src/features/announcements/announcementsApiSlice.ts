import { api } from '@/lib/api'
import type { Announcement, AnnouncementComment } from '@/types/api.types'
import { mergeById, removeById, upsertById } from '@/lib/merge'
import { getCachedQueryData, isNotModified } from '@/lib/cache'
import { setAnnouncementsLastFetched } from '@/store/slices/syncSlice'
import type { RootState } from '@/store/store'

const courseId = import.meta.env.VITE_COURSE_ID

type AnnouncementsResult = { announcements: Announcement[]; lastFetched: string }

export const announcementsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAnnouncements: builder.query<AnnouncementsResult, void>({
      queryFn: async (_arg, apiCtx, extra, baseQuery) => {
        const state = apiCtx.getState() as RootState
        const lastFetched = state.sync.announcementsLastFetchedAt
        const cached = getCachedQueryData<AnnouncementsResult>(state, 'getAnnouncements')
        const result = await baseQuery({
          url: `/courses/${courseId}/announcements`,
          params: lastFetched ? { lastFetched } : undefined,
        })
        if (result.error) {
          if (isNotModified(result) && cached) {
            return { data: cached }
          }
          return { error: result.error }
        }
        const data = result.data as AnnouncementsResult
        if (!data?.announcements && cached) {
          return { data: cached }
        }
        if (data.lastFetched) {
          apiCtx.dispatch(setAnnouncementsLastFetched(data.lastFetched))
        }
        return { data }
      },
      serializeQueryArgs: ({ endpointName }) => endpointName,
      merge: (current, incoming) => ({
        announcements: mergeById(current?.announcements, incoming.announcements),
        lastFetched: incoming.lastFetched ?? current.lastFetched,
      }),
      forceRefetch: ({ currentArg, previousArg }) => currentArg !== previousArg,
    }),
    createAnnouncement: builder.mutation<
      Announcement & { lastFetched?: string },
      { title: string; body?: string; details?: string }
    >({
      query: (data) => ({
        url: `/courses/${courseId}/announcements`,
        method: 'POST',
        body: { title: data.title, details: data.details ?? data.body, body: data.body },
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(
            announcementsApi.util.updateQueryData('getAnnouncements', undefined, (draft) => {
              draft.announcements = upsertById(draft.announcements, data)
              if (data.lastFetched) {
                draft.lastFetched = data.lastFetched
              }
            }),
          )
          if (data.lastFetched) {
            dispatch(setAnnouncementsLastFetched(data.lastFetched))
          }
        } catch {
          return
        }
      },
    }),
    updateAnnouncement: builder.mutation<
      Announcement,
      { announcementId: string; title: string; body: string }
    >({
      query: ({ announcementId, ...data }) => ({
        url: `/announcements/${announcementId}`,
        method: 'PUT',
        body: data,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(
            announcementsApi.util.updateQueryData('getAnnouncements', undefined, (draft) => {
              draft.announcements = upsertById(draft.announcements, data)
            }),
          )
        } catch {
          return
        }
      },
    }),
    deleteAnnouncement: builder.mutation<{ success: true; message: string }, string>({
      query: (announcementId) => ({
        url: `/announcements/${announcementId}`,
        method: 'DELETE',
      }),
      async onQueryStarted(announcementId, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
          dispatch(
            announcementsApi.util.updateQueryData('getAnnouncements', undefined, (draft) => {
              draft.announcements = removeById(draft.announcements, announcementId)
            }),
          )
        } catch {
          return
        }
      },
    }),
    getAnnouncementComments: builder.query<AnnouncementComment[], string>({
      query: (announcementId) => `/announcements/${announcementId}/comments`,
    }),
    addAnnouncementComment: builder.mutation<
      AnnouncementComment,
      { announcementId: string; comment: string }
    >({
      query: ({ announcementId, comment }) => ({
        url: `/announcements/${announcementId}/comments`,
        method: 'POST',
        body: { comment },
      }),
      async onQueryStarted({ announcementId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          let existed = false
          dispatch(
            announcementsApi.util.updateQueryData('getAnnouncementComments', announcementId, (draft) => {
              existed = draft.some((comment) => comment.id === data.id)
              return upsertById(draft, data)
            }),
          )
          if (!existed) {
            dispatch(
              announcementsApi.util.updateQueryData('getAnnouncements', undefined, (draft) => {
                const announcement = draft.announcements.find((item) => item.id === announcementId)
                if (announcement) {
                  announcement.commentsCount = (announcement.commentsCount ?? 0) + 1
                }
              }),
            )
          }
        } catch {
          return
        }
      },
    }),
    updateAnnouncementComment: builder.mutation<
      AnnouncementComment,
      { commentId: string; announcementId: string; body: string }
    >({
      query: ({ commentId, body }) => ({
        url: `/comments/${commentId}`,
        method: 'PUT',
        body: { body },
      }),
      async onQueryStarted({ announcementId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(
            announcementsApi.util.updateQueryData('getAnnouncementComments', announcementId, (draft) =>
              upsertById(draft, data),
            ),
          )
        } catch {
          return
        }
      },
    }),
    deleteAnnouncementComment: builder.mutation<
      { success: true; message: string },
      { commentId: string; announcementId: string }
    >({
      query: ({ commentId }) => ({
        url: `/comments/${commentId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ commentId, announcementId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
          dispatch(
            announcementsApi.util.updateQueryData('getAnnouncementComments', announcementId, (draft) =>
              removeById(draft, commentId),
            ),
          )
          dispatch(
            announcementsApi.util.updateQueryData('getAnnouncements', undefined, (draft) => {
              const announcement = draft.announcements.find((item) => item.id === announcementId)
              if (announcement) {
                announcement.commentsCount = Math.max((announcement.commentsCount ?? 1) - 1, 0)
              }
            }),
          )
        } catch {
          return
        }
      },
    }),
    diffAnnouncements: builder.mutation<
      { updated: Announcement[]; deleted: string[] },
      Array<{ id: string; updatedAt: string }>
    >({
      query: (entries) => ({
        url: `/courses/${courseId}/announcements/diff`,
        method: 'POST',
        body: entries,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(
            announcementsApi.util.updateQueryData('getAnnouncements', undefined, (draft) => {
              draft.announcements = mergeById(draft.announcements, data.updated).filter(
                (item) => !data.deleted.includes(item.id),
              )
            }),
          )
        } catch {
          return
        }
      },
    }),
  }),
})

export const {
  useGetAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
  useDeleteAnnouncementMutation,
  useGetAnnouncementCommentsQuery,
  useAddAnnouncementCommentMutation,
  useUpdateAnnouncementCommentMutation,
  useDeleteAnnouncementCommentMutation,
  useDiffAnnouncementsMutation,
} = announcementsApi
