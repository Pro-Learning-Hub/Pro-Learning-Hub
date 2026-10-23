import { api } from '@/lib/api'
import type { Section, Lecture, LectureFormData } from '@/types/api.types'
import { mergeById, upsertById, removeById } from '@/lib/merge'
import { getCachedQueryData, isNotModified } from '@/lib/cache'
import { setSectionsLastFetched, setSectionsLastSynced } from '@/store/slices/syncSlice'
import type { RootState } from '@/store/store'

const courseId = import.meta.env.VITE_COURSE_ID

type SectionsResult = { sections: Section[]; lastFetched: string; lastSynced?: string }

type SearchLecture = Partial<Lecture> & { id: string; title: string; sectionId: string; courseId: string }

function normalizeSearchLecture(lecture: SearchLecture): Lecture {
  const tags = lecture.tags as string[] | string | undefined
  return {
    ...lecture,
    description: lecture.description ?? '',
    videoLink: lecture.videoLink ?? '',
    tags: Array.isArray(tags)
      ? tags
      : typeof tags === 'string'
        ? tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : [],
    demos: lecture.demos ?? [],
    shorts: lecture.shorts ?? [],
    quizzez: lecture.quizzez ?? [],
    updatedAt: lecture.updatedAt ?? '',
    createdAt: lecture.createdAt ?? '',
  }
}

function mergeSections(current: Section[] = [], incoming: Section[] = []): Section[] {
  const map = new Map(current.map((section) => [section.id, section]))
  for (const section of incoming) {
    const existing = map.get(section.id)
    map.set(section.id, {
      ...existing,
      ...section,
      lectures: mergeById(existing?.lectures ?? [], section.lectures ?? []),
    })
  }
  return Array.from(map.values())
}

export const lecturesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSections: builder.query<SectionsResult, void>({
      queryFn: async (_arg, apiCtx, extra, baseQuery) => {
        const state = apiCtx.getState() as RootState
        const lastFetched = state.sync.sectionsLastFetchedAt
        const cached = getCachedQueryData<SectionsResult>(state, 'getSections')
        const result = await baseQuery({
          url: `/courses/${courseId}/lectures`,
          params: lastFetched ? { lastFetched } : undefined,
        })
        if (result.error) {
          if (isNotModified(result) && cached) {
            return { data: cached }
          }
          return { error: result.error }
        }
        const data = result.data as SectionsResult
        if (!data?.sections && cached) {
          return { data: cached }
        }
        if (data.lastFetched) {
          apiCtx.dispatch(setSectionsLastFetched(data.lastFetched))
        }
        return { data }
      },
      serializeQueryArgs: ({ endpointName }) => endpointName,
      merge: (current, incoming) => ({
        sections: mergeSections(current?.sections, incoming.sections),
        lastFetched: incoming.lastFetched ?? current.lastFetched,
        lastSynced: incoming.lastSynced ?? current.lastSynced,
      }),
      forceRefetch: ({ currentArg, previousArg }) => currentArg !== previousArg,
    }),
    getLecture: builder.query<{ lectureData: Lecture }, string>({
      queryFn: async (lectureId, apiCtx, _extra, baseQuery) => {
        const cached = getCachedQueryData<{ lectureData: Lecture }>(
          apiCtx.getState() as RootState,
          'getLecture',
          lectureId,
        )
        const updatedAt = cached?.lectureData?.updatedAt
        const result = await baseQuery({
          url: `/courses/${courseId}/lectures/${lectureId}`,
          params: updatedAt ? { updatedAt } : undefined,
        })
        if (result.error) {
          if (isNotModified(result) && cached) {
            return { data: cached }
          }
          return { error: result.error }
        }
        const data = result.data as { lectureData: Lecture } | undefined
        if (!data?.lectureData && cached) {
          return { data: cached }
        }
        return { data: data as { lectureData: Lecture } }
      },
      serializeQueryArgs: ({ queryArgs }) => queryArgs,
      merge: (current, incoming) => (incoming?.lectureData ? incoming : current),
      forceRefetch: ({ currentArg, previousArg }) => currentArg !== previousArg,
    }),
    getSectionTitles: builder.query<string[], void>({
      query: () => `/courses/${courseId}/sections_titles`,
    }),
    searchLectures: builder.query<Lecture[], string>({
      query: (query) => ({
        url: '/lectures/search',
        params: { courseId, query },
      }),
      transformResponse: (response: { results?: SearchLecture[] }) =>
        (response.results ?? []).map(normalizeSearchLecture),
      serializeQueryArgs: ({ queryArgs }) => queryArgs,
    }),
    createLecture: builder.mutation<Lecture, LectureFormData>({
      query: (data) => ({
        url: `/courses/${courseId}/lectures`,
        method: 'POST',
        body: data,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          const lecture: Lecture = {
            id: data.id,
            title: data.title ?? arg.name,
            description: data.description ?? arg.description,
            videoLink: data.videoLink ?? arg.youtubeLink,
            notes: data.notes ?? arg.notesLink,
            slides: data.slides ?? arg.slidesLink,
            tags: data.tags ?? arg.tags,
            demos: data.demos ?? arg.demos,
            shorts: data.shorts ?? arg.extras,
            quizzez: data.quizzez ?? [],
            sectionId: data.sectionId ?? '',
            courseId: data.courseId ?? courseId,
            updatedAt: data.updatedAt ?? '',
            createdAt: data.createdAt ?? '',
          }
          dispatch(
            lecturesApi.util.updateQueryData('getLecture', lecture.id, () => ({ lectureData: lecture })),
          )
          dispatch(
            lecturesApi.util.updateQueryData('getSections', undefined, (draft) => {
              const sectionTitle = arg.section
              const existing = draft.sections.find(
                (section) => section.id === lecture.sectionId || section.title === sectionTitle,
              )
              if (existing) {
                existing.lectures = upsertById(existing.lectures, {
                  ...lecture,
                  sectionId: existing.id,
                })
                return
              }
              draft.sections.push({
                id: lecture.sectionId || sectionTitle,
                title: sectionTitle,
                lectures: [{ ...lecture, sectionId: lecture.sectionId || sectionTitle }],
              })
            }),
          )
        } catch {
          return
        }
      },
    }),
    updateLecture: builder.mutation<
      Lecture,
      { lectureId: string; data: Partial<LectureFormData> }
    >({
      query: ({ lectureId, data }) => ({
        url: `/lectures/${lectureId}`,
        method: 'PUT',
        body: data,
      }),
      async onQueryStarted({ lectureId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(
            lecturesApi.util.updateQueryData('getLecture', lectureId, (draft) => {
              draft.lectureData = { ...draft.lectureData, ...data }
            }),
          )
          dispatch(
            lecturesApi.util.updateQueryData('getSections', undefined, (draft) => {
              draft.sections = draft.sections.map((section) => ({
                ...section,
                lectures: upsertById(section.lectures, { ...data, id: data.id ?? lectureId }),
              }))
            }),
          )
        } catch {
          return
        }
      },
    }),
    deleteLecture: builder.mutation<{ message: string }, { lectureId: string; sectionId: string }>({
      query: ({ lectureId }) => ({
        url: `/lectures/${lectureId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ lectureId, sectionId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
          dispatch(
            lecturesApi.util.updateQueryData('getSections', undefined, (draft) => {
              draft.sections = draft.sections
                .map((section) =>
                  section.id === sectionId
                    ? { ...section, lectures: removeById(section.lectures, lectureId) }
                    : section,
                )
                .filter((section) => section.lectures.length > 0)
            }),
          )
        } catch {
          return
        }
      },
    }),
    diffLectures: builder.mutation<
      {
        entries: {
          updated: Record<string, Array<Partial<Lecture> & { id: string; sectionId: string; courseId: string }>>
          deleted: { sections: string[]; lectures: Record<string, string[]> }
        }
        lastSynced: string
      },
      { entries: Record<string, string[]>; lastSynced: string }
    >({
      query: (body) => ({
        url: `/courses/${courseId}/lectures/diff`,
        method: 'POST',
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(setSectionsLastSynced(data.lastSynced))
          dispatch(
            lecturesApi.util.updateQueryData('getSections', undefined, (draft) => {
              for (const sectionId of data.entries.deleted.sections) {
                draft.sections = draft.sections.filter((section) => section.id !== sectionId)
              }
              for (const [sectionId, lectureIds] of Object.entries(data.entries.deleted.lectures)) {
                const section = draft.sections.find((item) => item.id === sectionId)
                if (section) {
                  section.lectures = section.lectures.filter((lecture) => !lectureIds.includes(lecture.id))
                }
              }
              for (const [sectionId, lectures] of Object.entries(data.entries.updated)) {
                let section = draft.sections.find((item) => item.id === sectionId)
                if (!section) {
                  section = { id: sectionId, title: '', lectures: [] }
                  draft.sections.push(section)
                }
                section.lectures = mergeById(
                  section.lectures,
                  lectures.map((lecture) => {
                    const tags = lecture.tags as string[] | string | undefined
                    return {
                    ...lecture,
                    tags: Array.isArray(tags)
                      ? tags
                      : typeof tags === 'string'
                        ? tags.split(',').map((tag) => tag.trim()).filter(Boolean)
                        : [],
                    demos: lecture.demos ?? [],
                    shorts: lecture.shorts ?? [],
                    quizzez: lecture.quizzez ?? [],
                    videoLink: lecture.videoLink ?? '',
                    updatedAt: lecture.updatedAt ?? '',
                    createdAt: lecture.createdAt ?? '',
                  }
                  }) as Lecture[],
                )
              }
              draft.lastFetched = data.lastSynced
              draft.lastSynced = data.lastSynced
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
  useGetSectionsQuery,
  useGetLectureQuery,
  useGetSectionTitlesQuery,
  useSearchLecturesQuery,
  useCreateLectureMutation,
  useUpdateLectureMutation,
  useDeleteLectureMutation,
  useDiffLecturesMutation,
} = lecturesApi
