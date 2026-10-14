import { api } from '@/lib/api'
import type { Question, Reply } from '@/types/api.types'
import { mergeById, removeById, upsertById } from '@/lib/merge'
import { getCachedQueryData, isNotModified } from '@/lib/cache'
import {
  setGeneralDiscussionLastFetched,
  setLectureDiscussionLastFetched,
  setRepliesLastFetched,
} from '@/store/slices/syncSlice'
import type { RootState } from '@/store/store'

const courseId = import.meta.env.VITE_COURSE_ID

function applyVoteDelta(upvotes: number, action: 'upvote' | 'downvote') {
  return action === 'upvote' ? upvotes + 1 : Math.max(upvotes - 1, 0)
}

export const discussionApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getGeneralDiscussion: builder.query<{ questions: Question[]; lastFetched: string }, void>({
      queryFn: async (_arg, apiCtx, extra, baseQuery) => {
        const state = apiCtx.getState() as RootState
        const lastFetched = state.sync.generalDiscussionLastFetchedAt
        const cached = getCachedQueryData<{ questions: Question[]; lastFetched: string }>(state, 'getGeneralDiscussion')
        const result = await baseQuery({
          url: `/courses/${courseId}/general_discussion`,
          params: lastFetched ? { lastFetched } : undefined,
        })
        if (result.error) {
          if (isNotModified(result) && cached) {
            return { data: cached }
          }
          return { error: result.error }
        }
        const data = result.data as { questions: Question[]; lastFetched: string }
        if (!data?.questions && cached) {
          return { data: cached }
        }
        if (data.lastFetched) {
          apiCtx.dispatch(setGeneralDiscussionLastFetched(data.lastFetched))
        }
        return { data }
      },
      serializeQueryArgs: ({ endpointName }) => endpointName,
      merge: (current, incoming) => ({
        questions: mergeById(current?.questions, incoming.questions),
        lastFetched: incoming.lastFetched ?? current.lastFetched,
      }),
      forceRefetch: ({ currentArg, previousArg }) => currentArg !== previousArg,
    }),
    searchQuestions: builder.query<
      string[],
      { courseId?: string; lectureId?: string; query: string }
    >({
      query: ({ courseId: c, lectureId, query }) => ({
        url: '/questions/search',
        params: c ? { courseId: c, query } : { lectureId, query },
      }),
      transformResponse: (response: { results?: string[] }) => response.results ?? [],
      serializeQueryArgs: ({ queryArgs }) =>
        `${queryArgs.courseId ?? ''}|${queryArgs.lectureId ?? ''}|${queryArgs.query}`,
    }),
    addGeneralQuestion: builder.mutation<
      { newEntry: Question; lastFetched: string },
      { title: string; body: string }
    >({
      query: (data) => ({
        url: `/courses/${courseId}/general_discussion`,
        method: 'POST',
        body: data,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(
            discussionApi.util.updateQueryData('getGeneralDiscussion', undefined, (draft) => {
              draft.questions = upsertById(draft.questions, data.newEntry)
              draft.lastFetched = data.lastFetched
            }),
          )
          dispatch(setGeneralDiscussionLastFetched(data.lastFetched))
        } catch {
          return
        }
      },
    }),
    getLectureDiscussion: builder.query<{ results: Question[]; lastFetched: string }, string>({
      queryFn: async (lectureId, apiCtx, extra, baseQuery) => {
        const state = apiCtx.getState() as RootState
        const lastFetched = state.sync.lectureDiscussionsLastFetchedAt[lectureId]
        const cached = getCachedQueryData<{ results: Question[]; lastFetched: string }>(
          state,
          'getLectureDiscussion',
          lectureId,
        )
        const result = await baseQuery({
          url: `/lectures/${lectureId}/discussion`,
          params: lastFetched ? { lastFetched } : undefined,
        })
        if (result.error) {
          if (isNotModified(result) && cached) {
            return { data: cached }
          }
          return { error: result.error }
        }
        const data = result.data as { results: Question[]; lastFetched: string }
        if (!data?.results && cached) {
          return { data: cached }
        }
        if (data.lastFetched) {
          apiCtx.dispatch(setLectureDiscussionLastFetched({ lectureId, lastFetched: data.lastFetched }))
        }
        return { data }
      },
      serializeQueryArgs: ({ queryArgs }) => queryArgs,
      merge: (current, incoming) => ({
        results: mergeById(current?.results, incoming.results),
        lastFetched: incoming.lastFetched ?? current.lastFetched,
      }),
      forceRefetch: ({ currentArg, previousArg }) => currentArg !== previousArg,
    }),
    addLectureQuestion: builder.mutation<
      { newEntry: Question; lastFetched: string },
      { lectureId: string; title: string; body: string }
    >({
      query: ({ lectureId, ...data }) => ({
        url: `/lectures/${lectureId}/discussion`,
        method: 'POST',
        body: data,
      }),
      async onQueryStarted({ lectureId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(
            discussionApi.util.updateQueryData('getLectureDiscussion', lectureId, (draft) => {
              draft.results = upsertById(draft.results, data.newEntry)
              draft.lastFetched = data.lastFetched
            }),
          )
          dispatch(setLectureDiscussionLastFetched({ lectureId, lastFetched: data.lastFetched }))
        } catch {
          return
        }
      },
    }),
    getReplies: builder.query<
      { question: Question; repliesList: Reply[]; lastFetched: string },
      string
    >({
      queryFn: async (questionId, apiCtx, extra, baseQuery) => {
        const state = apiCtx.getState() as RootState
        const lastFetched = state.sync.repliesLastFetchedAt[questionId]
        const cached = getCachedQueryData<{ question: Question; repliesList: Reply[]; lastFetched: string }>(
          state,
          'getReplies',
          questionId,
        )
        const result = await baseQuery({
          url: `/questions/${questionId}/replies`,
          params: lastFetched ? { lastFetched } : undefined,
        })
        if (result.error) {
          if (isNotModified(result) && cached) {
            return { data: cached }
          }
          return { error: result.error }
        }
        const data = result.data as { question: Question; repliesList: Reply[]; lastFetched: string }
        if (!data?.repliesList && cached) {
          return { data: cached }
        }
        if (data.lastFetched) {
          apiCtx.dispatch(setRepliesLastFetched({ questionId, lastFetched: data.lastFetched }))
        }
        return { data }
      },
      serializeQueryArgs: ({ queryArgs }) => queryArgs,
      merge: (current, incoming) => ({
        question: { ...current?.question, ...incoming.question },
        repliesList: mergeById(current?.repliesList, incoming.repliesList),
        lastFetched: incoming.lastFetched ?? current.lastFetched,
      }),
      forceRefetch: ({ currentArg, previousArg }) => currentArg !== previousArg,
    }),
    addReply: builder.mutation<
      { newReply: Reply; lastFetched: string },
      { questionId: string; body: string }
    >({
      query: ({ questionId, body }) => ({
        url: `/questions/${questionId}/replies`,
        method: 'POST',
        body: { body },
      }),
      async onQueryStarted({ questionId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(
            discussionApi.util.updateQueryData('getReplies', questionId, (draft) => {
              draft.repliesList = upsertById(draft.repliesList, data.newReply)
              draft.lastFetched = data.lastFetched
              if (draft.question) {
                draft.question.repliesCount = (draft.question.repliesCount ?? 0) + 1
              }
            }),
          )
          dispatch(setRepliesLastFetched({ questionId, lastFetched: data.lastFetched }))
        } catch {
          return
        }
      },
    }),
    toggleQuestionVote: builder.mutation<
      { message: string },
      { questionId: string; action: 'upvote' | 'downvote'; lectureId?: string }
    >({
      query: ({ questionId, action }) => ({
        url: `/questions/${questionId}/vote`,
        method: 'POST',
        body: { action },
      }),
      async onQueryStarted({ questionId, action, lectureId }, { dispatch, queryFulfilled }) {
        const patchList = (list: Question[]) => {
          const question = list.find((item) => item.id === questionId)
          if (question) {
            question.upvoted = action === 'upvote'
            question.upvotes = applyVoteDelta(question.upvotes, action)
          }
        }
        const patches = [
          dispatch(
            discussionApi.util.updateQueryData('getGeneralDiscussion', undefined, (draft) => {
              patchList(draft.questions)
            }),
          ),
          dispatch(
            discussionApi.util.updateQueryData('getReplies', questionId, (draft) => {
              if (draft.question) {
                draft.question.upvoted = action === 'upvote'
                draft.question.upvotes = applyVoteDelta(draft.question.upvotes, action)
              }
            }),
          ),
        ]
        if (lectureId) {
          patches.push(
            dispatch(
              discussionApi.util.updateQueryData('getLectureDiscussion', lectureId, (draft) => {
                patchList(draft.results)
              }),
            ),
          )
        }
        try {
          await queryFulfilled
        } catch {
          patches.forEach((patch) => patch.undo())
        }
      },
    }),
    toggleReplyVote: builder.mutation<
      { message: string },
      { replyId: string; questionId: string; action: 'upvote' | 'downvote' }
    >({
      query: ({ replyId, action }) => ({
        url: `/replies/${replyId}/vote`,
        method: 'POST',
        body: { action },
      }),
      async onQueryStarted({ replyId, questionId, action }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          discussionApi.util.updateQueryData('getReplies', questionId, (draft) => {
            const reply = draft.repliesList.find((item) => item.id === replyId)
            if (reply) {
              reply.upvoted = action === 'upvote'
              reply.upvotes = applyVoteDelta(reply.upvotes, action)
            }
          }),
        )
        try {
          await queryFulfilled
        } catch {
          patch.undo()
        }
      },
    }),
    deleteQuestion: builder.mutation<{ message: string }, { questionId: string; lectureId?: string }>({
      query: ({ questionId }) => ({
        url: `/questions/${questionId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ questionId, lectureId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
          dispatch(
            discussionApi.util.updateQueryData('getGeneralDiscussion', undefined, (draft) => {
              draft.questions = removeById(draft.questions, questionId)
            }),
          )
          if (lectureId) {
            dispatch(
              discussionApi.util.updateQueryData('getLectureDiscussion', lectureId, (draft) => {
                draft.results = removeById(draft.results, questionId)
              }),
            )
          }
        } catch {
          return
        }
      },
    }),
    deleteReply: builder.mutation<{ message: string }, { replyId: string; questionId: string }>({
      query: ({ replyId }) => ({
        url: `/replies/${replyId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ replyId, questionId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
          dispatch(
            discussionApi.util.updateQueryData('getReplies', questionId, (draft) => {
              draft.repliesList = removeById(draft.repliesList, replyId)
              if (draft.question) {
                draft.question.repliesCount = Math.max((draft.question.repliesCount ?? 1) - 1, 0)
              }
            }),
          )
        } catch {
          return
        }
      },
    }),
    diffQuestions: builder.mutation<
      {
        results: {
          existing: Record<string, Partial<Question> & { id: string; upvotes: number; repliesCount?: number }>
          deleted: string[]
        }
        lastSynced: string
      },
      {
        entries: Array<{ id: string; updatedAt: string }>
        lastFetched?: string
        courseId?: string
        lectureId?: string
      }
    >({
      query: (body) => ({
        url: '/questions/diff',
        method: 'POST',
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          const apply = (list: Question[]) => {
            const next = list
              .filter((item) => !data.results.deleted.includes(item.id))
              .map((item) => {
                const update = data.results.existing[item.id]
                return update ? { ...item, ...update } : item
              })
            return next
          }
          if (arg.lectureId) {
            dispatch(
              discussionApi.util.updateQueryData('getLectureDiscussion', arg.lectureId, (draft) => {
                draft.results = apply(draft.results)
                draft.lastFetched = data.lastSynced
              }),
            )
            dispatch(setLectureDiscussionLastFetched({ lectureId: arg.lectureId, lastFetched: data.lastSynced }))
          } else {
            dispatch(
              discussionApi.util.updateQueryData('getGeneralDiscussion', undefined, (draft) => {
                draft.questions = apply(draft.questions)
                draft.lastFetched = data.lastSynced
              }),
            )
            dispatch(setGeneralDiscussionLastFetched(data.lastSynced))
          }
        } catch {
          return
        }
      },
    }),
    diffReplies: builder.mutation<
      {
        results: {
          existing: Record<string, Partial<Reply> & { id: string; upvotes: number }>
          deleted: string[]
        }
        lastSynced: string
        questionId: string
      },
      { questionId: string; entries: Array<{ id: string; updatedAt: string }>; lastFetched?: string }
    >({
      query: ({ questionId, entries, lastFetched }) => ({
        url: `/questions/${questionId}/replies/diff`,
        method: 'POST',
        body: { entries, lastFetched },
      }),
      async onQueryStarted({ questionId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(
            discussionApi.util.updateQueryData('getReplies', questionId, (draft) => {
              draft.repliesList = draft.repliesList
                .filter((item) => !data.results.deleted.includes(item.id))
                .map((item) => {
                  const update = data.results.existing[item.id]
                  return update ? { ...item, ...update } : item
                })
              draft.lastFetched = data.lastSynced
            }),
          )
          dispatch(setRepliesLastFetched({ questionId, lastFetched: data.lastSynced }))
        } catch {
          return
        }
      },
    }),
  }),
})

export const {
  useGetGeneralDiscussionQuery,
  useSearchQuestionsQuery,
  useAddGeneralQuestionMutation,
  useGetLectureDiscussionQuery,
  useAddLectureQuestionMutation,
  useGetRepliesQuery,
  useAddReplyMutation,
  useToggleQuestionVoteMutation,
  useToggleReplyVoteMutation,
  useDeleteQuestionMutation,
  useDeleteReplyMutation,
  useDiffQuestionsMutation,
  useDiffRepliesMutation,
} = discussionApi
