import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import {
  discussionApi,
  useGetGeneralDiscussionQuery,
  useSearchQuestionsQuery,
  useAddGeneralQuestionMutation,
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
import { setGeneralDiscussionLastFetched } from '@/store/slices/syncSlice'
import { toast } from 'sonner'
import type { Question } from '@/types/api.types'

const courseId = import.meta.env.VITE_COURSE_ID

export function GeneralDiscussionPage() {
  const isSocketReady = useAppSelector((s) => s.auth.isSocketReady)
  const lastFetched = useAppSelector((s) => s.sync.generalDiscussionLastFetchedAt)
  const dispatch = useAppDispatch()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const didDiff = useRef(false)

  const debouncedSearch = useDebounce(search, 300)
  const trimmedSearch = debouncedSearch.trim()
  const showSearchList = Boolean(search.trim() && trimmedSearch)

  const { data, isLoading, isError } = useGetGeneralDiscussionQuery()
  const { data: searchIds, isFetching: isSearching } = useSearchQuestionsQuery(
    { courseId, query: trimmedSearch },
    { skip: !trimmedSearch },
  )
  const [addQuestion, { isLoading: isPosting }] = useAddGeneralQuestionMutation()
  const [diffQuestions] = useDiffQuestionsMutation()

  useEffect(() => {
    const socket = getSocket()
    if (socket && courseId) {
      const room = `generalDiscussion-${courseId}`
      socket.emit('joinRoom', room)
      return () => { socket.emit('leaveRoom', room) }
    }
  }, [isSocketReady])

  useEffect(() => {
    if (didDiff.current || !data?.questions?.length) {
      return
    }
    didDiff.current = true
    void diffQuestions({
      courseId,
      lastFetched: lastFetched ?? undefined,
      entries: data.questions.map((question) => ({ id: question.id, updatedAt: question.updatedAt })),
    })
  }, [data?.questions, lastFetched, diffQuestions])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const patch = (updater: (questions: Question[]) => Question[], nextFetched?: string) => {
      dispatch(
        discussionApi.util.updateQueryData('getGeneralDiscussion', undefined, (draft) => {
          draft.questions = updater(draft.questions)
          if (nextFetched) {
            draft.lastFetched = nextFetched
          }
        }),
      )
      if (nextFetched) {
        dispatch(setGeneralDiscussionLastFetched(nextFetched))
      }
    }

    const onCreated = ({ payload }: { payload: { newEntry: Question; lastFetched: string } }) => {
      patch((questions) => upsertById(questions, payload.newEntry), payload.lastFetched)
    }
    const onDeleted = ({ payload }: { payload: { questionId: string } }) => {
      patch((questions) => removeById(questions, payload.questionId))
    }
    const onEdited = ({ payload }: { payload: { editedQuestion: Question } }) => {
      patch((questions) => upsertById(questions, payload.editedQuestion))
    }
    const onVote = ({ payload }: { payload: { questionId: string; isUpvoted: boolean; lectureId?: string } }) => {
      if (payload.lectureId) return
      patch((questions) =>
        questions.map((question) =>
          question.id === payload.questionId ? applyRemoteVote(question, payload.isUpvoted) : question,
        ),
      )
    }
    const onReplyCreated = ({ payload }: { payload: { questionId: string; lectureId?: string } }) => {
      if (payload.lectureId) return
      patch((questions) =>
        questions.map((question) =>
          question.id === payload.questionId
            ? { ...question, repliesCount: (question.repliesCount ?? 0) + 1 }
            : question,
        ),
      )
    }
    const onReplyDeleted = ({ payload }: { payload: { questionId: string; lectureId?: string } }) => {
      if (payload.lectureId) return
      patch((questions) =>
        questions.map((question) =>
          question.id === payload.questionId
            ? { ...question, repliesCount: Math.max((question.repliesCount ?? 1) - 1, 0) }
            : question,
        ),
      )
    }

    socket.on('generalDiscussionQuestionCreated', onCreated)
    socket.on('generalDiscussionQuestionDeleted', onDeleted)
    socket.on('generalDiscussionQuestionEdited', onEdited)
    socket.on('questionUpvoteToggled', onVote)
    socket.on('replyCreated', onReplyCreated)
    socket.on('replyDeleted', onReplyDeleted)
    return () => {
      socket.off('generalDiscussionQuestionCreated', onCreated)
      socket.off('generalDiscussionQuestionDeleted', onDeleted)
      socket.off('generalDiscussionQuestionEdited', onEdited)
      socket.off('questionUpvoteToggled', onVote)
      socket.off('replyCreated', onReplyCreated)
      socket.off('replyDeleted', onReplyDeleted)
    }
  }, [dispatch, isSocketReady])

  const handlePost = async (title: string, body: string) => {
    try {
      await addQuestion({ title, body }).unwrap()
      toast.success('Question posted!')
      setShowForm(false)
    } catch {
      toast.error('Failed to post question')
    }
  }

  const questions = data?.questions ?? []
  const filtered =
    showSearchList && searchIds
      ? searchIds
          .map((id) => questions.find((q) => q.id === id))
          .filter((q): q is Question => Boolean(q))
      : questions
  const sorted = [...filtered].sort((a, b) => b.upvotes - a.upvotes)

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">General Discussion</h1>
        <p className="text-muted-foreground text-sm">Course Discussion Forum</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search questions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>Failed to load discussion.</AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && (
        <div className="space-y-3">
          {showSearchList && isSearching ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)
          ) : sorted.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              {showSearchList ? 'No questions match your search.' : 'No questions yet. Be the first to ask!'}
            </p>
          ) : (
            sorted.map((q) => (
              <QuestionCard key={q.id} question={q} backRoute="/discussion" />
            ))
          )}
        </div>
      )}

      <div className="mt-6">
        {showForm ? (
          <QuestionForm
            onSubmit={handlePost}
            onCancel={() => setShowForm(false)}
            isLoading={isPosting}
          />
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowForm(true)}
          >
            Ask a new question
          </Button>
        )}
      </div>
    </div>
  )
}
