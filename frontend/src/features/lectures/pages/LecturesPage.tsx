import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import {
  useGetSectionsQuery,
  useSearchLecturesQuery,
  lecturesApi,
  useDiffLecturesMutation,
} from '../lecturesApiSlice'
import { SectionAccordion } from '../components/SectionAccordion'
import { LectureCard } from '../components/LectureCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { useDebounce } from '@/hooks/use-debounce'
import { getSocket } from '@/lib/socket'
import { upsertById, removeById } from '@/lib/merge'
import { setSectionsLastFetched } from '@/store/slices/syncSlice'
import type { Lecture, Section } from '@/types/api.types'

const courseId = import.meta.env.VITE_COURSE_ID

export function LecturesPage() {
  const userRole = useAppSelector((s) => s.auth.user?.role)
  const isSocketReady = useAppSelector((s) => s.auth.isSocketReady)
  const lastSynced = useAppSelector((s) => s.sync.sectionsLastSyncedAt)
  const dispatch = useAppDispatch()
  const [search, setSearch] = useState('')
  const [diffLectures] = useDiffLecturesMutation()
  const didDiff = useRef(false)

  const debouncedSearch = useDebounce(search, 300)
  const trimmedSearch = debouncedSearch.trim()
  const showSearchList = Boolean(search.trim() && trimmedSearch)

  const { data, isLoading, isError } = useGetSectionsQuery()
  const {
    data: searchResults,
    isFetching: isSearching,
    isError: isSearchError,
  } = useSearchLecturesQuery(trimmedSearch, { skip: !trimmedSearch })

  useEffect(() => {
    const socket = getSocket()
    if (socket && courseId) {
      const room = `sections-${courseId}`
      socket.emit('joinRoom', room)
      return () => { socket.emit('leaveRoom', room) }
    }
  }, [isSocketReady])

  useEffect(() => {
    if (didDiff.current || !data?.sections?.length || !lastSynced) {
      return
    }
    didDiff.current = true
    const entries = data.sections.reduce<Record<string, string[]>>((acc, section) => {
      acc[section.id] = section.lectures.map((lecture) => lecture.id)
      return acc
    }, {})
    void diffLectures({ entries, lastSynced })
  }, [data?.sections, lastSynced, diffLectures])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const patch = (updater: (sections: Section[]) => Section[], lastFetched?: string) => {
      dispatch(
        lecturesApi.util.updateQueryData('getSections', undefined, (draft) => {
          draft.sections = updater(draft.sections)
          if (lastFetched) {
            draft.lastFetched = lastFetched
          }
        }),
      )
      if (lastFetched) {
        dispatch(setSectionsLastFetched(lastFetched))
      }
    }

    const onLectureCreated = ({ payload }: { payload: { sectionId: string; lecture: Lecture; lastFetched: string } }) => {
      patch(
        (sections) =>
          sections.map((section) =>
            section.id === payload.sectionId
              ? { ...section, lectures: upsertById(section.lectures, payload.lecture) }
              : section,
          ),
        payload.lastFetched,
      )
    }
    const onSectionCreated = ({ payload }: { payload: { newSection: Section; lastFetched: string } }) => {
      patch((sections) => upsertById(sections, payload.newSection), payload.lastFetched)
    }
    const onLectureUpdated = ({ payload }: { payload: { updatedLecture: Lecture } }) => {
      patch((sections) =>
        sections.map((section) => ({
          ...section,
          lectures: upsertById(section.lectures, payload.updatedLecture),
        })),
      )
    }
    const onLectureDeleted = ({ payload }: { payload: { lectureId: string; sectionId: string } }) => {
      patch((sections) =>
        sections
          .map((section) =>
            section.id === payload.sectionId
              ? { ...section, lectures: removeById(section.lectures, payload.lectureId) }
              : section,
          )
          .filter((section) => section.lectures.length > 0),
      )
    }

    socket.on('lectureCreated', onLectureCreated)
    socket.on('sectionCreated', onSectionCreated)
    socket.on('lectureUpdated', onLectureUpdated)
    socket.on('lectureDeleted', onLectureDeleted)
    return () => {
      socket.off('lectureCreated', onLectureCreated)
      socket.off('sectionCreated', onSectionCreated)
      socket.off('lectureUpdated', onLectureUpdated)
      socket.off('lectureDeleted', onLectureDeleted)
    }
  }, [dispatch, isSocketReady])

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Lectures</h1>
        <p className="text-muted-foreground">
          Find everything you need to enhance your learning experience.
        </p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search lectures..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {userRole && userRole !== 'student' && (
        <div className="mb-6 flex justify-end">
          <Button asChild>
            <Link to="/lectures/new" className="gap-2">
              <Plus className="size-4" />
              New Lecture
            </Link>
          </Button>
        </div>
      )}

      {showSearchList ? (
        <div className="flex flex-col gap-2">
          {isSearching && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          )}

          {!isSearching && isSearchError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>Failed to search lectures.</AlertDescription>
            </Alert>
          )}

          {!isSearching && !isSearchError && searchResults?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No lectures match your search.
            </p>
          )}

          {!isSearching &&
            searchResults?.map((lecture) => <LectureCard key={lecture.id} lecture={lecture} />)}
        </div>
      ) : (
        <>
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          )}

          {isError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>Failed to load lectures.</AlertDescription>
            </Alert>
          )}

          {data?.sections && <SectionAccordion sections={data.sections} />}
        </>
      )}
    </div>
  )
}
