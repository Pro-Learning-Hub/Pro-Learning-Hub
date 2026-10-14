import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import {
  discussionApi,
  useGetLectureDiscussionQuery,
  useSearchQuestionsQuery,
  useAddLectureQuestionMutation,
  useDiffQuestionsMutation,
} from '../discussionApiSlice'
import { QuestionCard } from '../components/QuestionCard'
import { QuestionForm } from '../components/QuestionForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { useDebounce } from '@/hooks/use-debounce'
import { getSocket } from '@/lib/socket'
import { upsertById, removeById, applyRemoteVote } from '@/lib/merge'
import { setLectureDiscussionLastFetched } from '@/store/slices/syncSlice'
import { toast } from 'sonner'
import type { Question } from '@/types/api.types'

interface LectureDiscussionPageProps {
  lectureId: string
}

export function LectureDiscussionPage({ lectureId }: LectureDiscussionPageProps) {
  const isSocketReady = useAppSelector((s) => s.auth.isSocketReady)
  const lastFetched = useAppSelector((s) => s.sync.lectureDiscussionsLastFetchedAt[lectureId])
  const dispatch = useAppDispatch()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const didDiff = useRef(false)

  const debouncedSearch = useDebounce(search, 300)
  const trimmedSearch = debouncedSearch.trim()
  const showSearchList = Boolean(search.trim() && trimmedSearch)

  const { data, isLoading, isError } = useGetLectureDiscussionQuery(lectureId, { skip: !lectureId })
  const { data: searchIds, isFetching: isSearching } = useSearchQuestionsQuery(
    { lectureId, query: trimmedSearch },
    { skip: !trimmedSearch },
  )
  const [addQuestion, { isLoading: isPosting }] = useAddLectureQuestionMutation()
  const [diffQuestions] = useDiffQuestionsMutation()

  useEffect(() => {
    const socket = getSocket()
    if (socket && lectureId) {
      const room = `lectureDiscussion-${lectureId}`
      socket.emit('joinRoom', room)
      return () => { socket.emit('leaveRoom', room) }
    }
  }, [lectureId, isSocketReady])

  useEffect(() => {
    if (didDiff.current || !lectureId || !data?.results?.length) {
      return
    }
    didDiff.current = true
    void diffQuestions({
      lectureId,
      lastFetched,
      entries: data.results.map((question) => ({ id: question.id, updatedAt: question.updatedAt })),
    })
  }, [lectureId, data?.results, lastFetched, diffQuestions])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const patch = (updater: (questions: Question[]) => Question[], nextFetched?: string) => {
      dispatch(
        discussionApi.util.updateQueryData('getLectureDiscussion', lectureId, (draft) => {
          draft.results = updater(draft.results)
          if (nextFetched) {
            draft.lastFetched = nextFetched
          }
        }),
      )
      if (nextFetched) {
        dispatch(setLectureDiscussionLastFetched({ lectureId, lastFetched: nextFetched }))
      }
    }

    const onCreated = ({ payload }: { payload: { lectureId: string; question: Question; lastFetched: string } }) => {
      if (payload.lectureId !== lectureId) return
      patch((questions) => upsertById(questions, payload.question), payload.lastFetched)
    }
    const onDeleted = ({ payload }: { payload: { questionId: string; lectureId: string } }) => {
      if (payload.lectureId !== lectureId) return
      patch((questions) => removeById(questions, payload.questionId))
    }
    const onEdited = ({ payload }: { payload: { editedQuestion: Question } }) => {
      patch((questions) => upsertById(questions, payload.editedQuestion))
    }
    const onVote = ({ payload }: { payload: { questionId: string; isUpvoted: boolean; lectureId?: string } }) => {
      if (payload.lectureId && payload.lectureId !== lectureId) return
      patch((questions) =>
        questions.map((question) =>
          question.id === payload.questionId ? applyRemoteVote(question, payload.isUpvoted) : question,
        ),
      )
    }
    const onReplyCreated = ({ payload }: { payload: { questionId: string; lectureId?: string } }) => {
      if (payload.lectureId && payload.lectureId !== lectureId) return
      patch((questions) =>
        questions.map((question) =>
          question.id === payload.questionId
            ? { ...question, repliesCount: (question.repliesCount ?? 0) + 1 }
            : question,
        ),
      )
    }
    const onReplyDeleted = ({ payload }: { payload: { questionId: string; lectureId?: string } }) => {
      if (payload.lectureId && payload.lectureId !== lectureId) return
      patch((questions) =>
        questions.map((question) =>
          question.id === payload.questionId
            ? { ...question, repliesCount: Math.max((question.repliesCount ?? 1) - 1, 0) }
            : question,
        ),
      )
    }

    socket.on('lectureQuestionCreated', onCreated)
    socket.on('lectureQuestionDeleted', onDeleted)
    socket.on('lectureQuestionEdited', onEdited)
    socket.on('questionUpvoteToggled', onVote)
    socket.on('replyCreated', onReplyCreated)
    socket.on('replyDeleted', onReplyDeleted)
    return () => {
      socket.off('lectureQuestionCreated', onCreated)
      socket.off('lectureQuestionDeleted', onDeleted)
      socket.off('lectureQuestionEdited', onEdited)
      socket.off('questionUpvoteToggled', onVote)
      socket.off('replyCreated', onReplyCreated)
      socket.off('replyDeleted', onReplyDeleted)
    }
  }, [dispatch, lectureId, isSocketReady])

  const handlePost = async (title: string, body: string) => {
    try {
      await addQuestion({ lectureId, title, body }).unwrap()
      toast.success('Question posted!')
      setShowForm(false)
    } catch {
      toast.error('Failed to post question')
    }
  }

  const questions = data?.results ?? []
  const filtered =
    showSearchList && searchIds
      ? searchIds
          .map((id) => questions.find((q) => q.id === id))
          .filter((q): q is Question => Boolean(q))
      : questions
  const sorted = [...filtered].sort((a, b) => b.upvotes - a.upvotes)
  const backRoute = `/lectures/${lectureId}`

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
      </div>
    )
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>Failed to load discussion.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-lg">Lecture Discussion</h2>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search lecture questions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-3">
        {showSearchList && isSearching ? (
          [1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            {showSearchList
              ? 'No questions match your search.'
              : 'No questions yet. Be the first to ask!'}
          </p>
        ) : (
          sorted.map((q) => (
            <QuestionCard key={q.id} question={q} backRoute={backRoute} lectureId={lectureId} />
          ))
        )}
      </div>

      {showForm ? (
        <QuestionForm
          onSubmit={handlePost}
          onCancel={() => setShowForm(false)}
          isLoading={isPosting}
        />
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setShowForm(true)}>
          Ask a question about this lecture
        </Button>
      )}
    </div>
  )
}
