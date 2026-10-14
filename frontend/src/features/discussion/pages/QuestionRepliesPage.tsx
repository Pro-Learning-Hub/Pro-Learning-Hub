import { useParams, Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, CircleArrowUp } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import {
  discussionApi,
  useGetRepliesQuery,
  useAddReplyMutation,
  useToggleQuestionVoteMutation,
  useUpdateQuestionMutation,
  useDeleteQuestionMutation,
  useDiffRepliesMutation,
} from '../discussionApiSlice'
import { ReplyCard } from '../components/ReplyCard'
import { ReplyForm } from '../components/ReplyForm'
import { QuestionForm } from '../components/QuestionForm'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { AlertCircle, Trash2, SquarePen } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { getSocket } from '@/lib/socket'
import { upsertById, removeById, applyRemoteVote } from '@/lib/merge'
import { setRepliesLastFetched } from '@/store/slices/syncSlice'
import { toast } from 'sonner'
import type { Question, Reply } from '@/types/api.types'

export function QuestionRepliesPage() {
  const { questionId } = useParams<{ questionId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { backRoute = '/discussion' } = (location.state as { backRoute?: string }) ?? {}
  const isSocketReady = useAppSelector((s) => s.auth.isSocketReady)
  const userId = useAppSelector((s) => s.auth.user?.id)
  const userRole = useAppSelector((s) => s.auth.user?.role)
  const lastFetched = useAppSelector((s) => (questionId ? s.sync.repliesLastFetchedAt[questionId] : undefined))
  const dispatch = useAppDispatch()
  const [confirmDeleteQuestion, setConfirmDeleteQuestion] = useState(false)
  const [editQuestion, setEditQuestion] = useState(false)
  const didDiff = useRef(false)

  const { data, isLoading, isError } = useGetRepliesQuery(questionId ?? '', { skip: !questionId })
  const [addReply, { isLoading: isPosting }] = useAddReplyMutation()
  const [toggleVote] = useToggleQuestionVoteMutation()
  const [updateQuestion, { isLoading: isSavingQuestion }] = useUpdateQuestionMutation()
  const [deleteQuestion] = useDeleteQuestionMutation()
  const [diffReplies] = useDiffRepliesMutation()

  useEffect(() => {
    const socket = getSocket()
    if (socket && questionId) {
      const room = `question-${questionId}`
      socket.emit('joinRoom', room)
      return () => { socket.emit('leaveRoom', room) }
    }
  }, [questionId, isSocketReady])

  useEffect(() => {
    if (didDiff.current || !questionId || !data?.repliesList?.length) {
      return
    }
    didDiff.current = true
    void diffReplies({
      questionId,
      lastFetched,
      entries: data.repliesList.map((reply) => ({ id: reply.id, updatedAt: reply.updatedAt })),
    })
  }, [questionId, data?.repliesList, lastFetched, diffReplies])

  useEffect(() => {
    const socket = getSocket()
    if (!socket || !questionId) return

    const patchReplies = (updater: (replies: Reply[]) => Reply[], nextFetched?: string) => {
      dispatch(
        discussionApi.util.updateQueryData('getReplies', questionId, (draft) => {
          draft.repliesList = updater(draft.repliesList)
          if (nextFetched) {
            draft.lastFetched = nextFetched
          }
        }),
      )
      if (nextFetched) {
        dispatch(setRepliesLastFetched({ questionId, lastFetched: nextFetched }))
      }
    }

    const patchQuestion = (updater: (question: Question) => Question) => {
      dispatch(
        discussionApi.util.updateQueryData('getReplies', questionId, (draft) => {
          if (draft.question) {
            draft.question = updater(draft.question)
          }
        }),
      )
    }

    const onReplyCreated = ({ payload }: { payload: { newReply: Reply; lastFetched: string } }) => {
      if (payload.newReply.questionId !== questionId) return
      patchReplies((replies) => upsertById(replies, payload.newReply), payload.lastFetched)
      patchQuestion((question) => ({ ...question, repliesCount: (question.repliesCount ?? 0) + 1 }))
    }
    const onReplyDeleted = ({ payload }: { payload: { replyId: string; questionId: string } }) => {
      if (payload.questionId !== questionId) return
      patchReplies((replies) => removeById(replies, payload.replyId))
      patchQuestion((question) => ({ ...question, repliesCount: Math.max((question.repliesCount ?? 1) - 1, 0) }))
    }
    const onReplyUpdated = ({ payload }: { payload: { updatedReply: Reply } }) => {
      if (payload.updatedReply.questionId !== questionId) return
      patchReplies((replies) => upsertById(replies, payload.updatedReply))
    }
    const onReplyVote = ({ payload }: { payload: { replyId: string; questionId: string; isUpvoted: boolean } }) => {
      if (payload.questionId !== questionId) return
      patchReplies((replies) =>
        replies.map((reply) => (reply.id === payload.replyId ? applyRemoteVote(reply, payload.isUpvoted) : reply)),
      )
    }
    const onQuestionEdited = ({ payload }: { payload: { editedQuestion: Question } }) => {
      if (payload.editedQuestion.id !== questionId) return
      patchQuestion((question) => ({ ...question, ...payload.editedQuestion }))
    }
    const onQuestionDeleted = ({ payload }: { payload: { questionId: string } }) => {
      if (payload.questionId !== questionId) return
      toast('Question deleted remotely')
      navigate(backRoute, { replace: true })
    }
    const onQuestionVote = ({ payload }: { payload: { questionId: string; isUpvoted: boolean } }) => {
      if (payload.questionId !== questionId) return
      patchQuestion((question) => applyRemoteVote(question, payload.isUpvoted))
    }

    socket.on('replyCreated', onReplyCreated)
    socket.on('replyDeleted', onReplyDeleted)
    socket.on('replyUpdated', onReplyUpdated)
    socket.on('replyUpvoteToggled', onReplyVote)
    socket.on('questionEdited', onQuestionEdited)
    socket.on('questionDeleted', onQuestionDeleted)
    socket.on('questionUpvoteToggled', onQuestionVote)
    return () => {
      socket.off('replyCreated', onReplyCreated)
      socket.off('replyDeleted', onReplyDeleted)
      socket.off('replyUpdated', onReplyUpdated)
      socket.off('replyUpvoteToggled', onReplyVote)
      socket.off('questionEdited', onQuestionEdited)
      socket.off('questionDeleted', onQuestionDeleted)
      socket.off('questionUpvoteToggled', onQuestionVote)
    }
  }, [dispatch, questionId, isSocketReady, navigate, backRoute])

  const handleAddReply = async (body: string) => {
    if (!questionId) return
    try {
      await addReply({ questionId, body }).unwrap()
      toast.success('Reply posted!')
    } catch {
      toast.error('Failed to post reply')
    }
  }

  const question = data?.question

  const handleVote = async () => {
    if (!questionId) return
    try {
      await toggleVote({
        questionId,
        lectureId: question?.lectureId,
        action: question?.upvoted ? 'downvote' : 'upvote',
      }).unwrap()
    } catch {
      toast.error('Failed to vote')
    }
  }

  const handleDeleteQuestion = async () => {
    if (!questionId) return
    try {
      await deleteQuestion({ questionId, lectureId: question?.lectureId }).unwrap()
      toast.success('Question deleted')
      navigate(backRoute, { replace: true })
    } catch {
      toast.error('Failed to delete question')
    }
  }

  const handleEditQuestion = async (title: string, body: string) => {
    if (!questionId) return
    try {
      await updateQuestion({ questionId, title, body, lectureId: question?.lectureId }).unwrap()
      toast.success('Question updated')
      setEditQuestion(false)
    } catch {
      toast.error('Failed to update question')
    }
  }

  const replies = data?.repliesList ?? []
  const sortedReplies = [...replies].sort((a, b) => b.upvotes - a.upvotes)
  const canDeleteQuestion =
    question && (userRole !== 'student' || userId === question.user?.id)
  const canEditQuestion = question && userId === question.user?.id

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Button asChild variant="ghost" className="mb-4 -ml-2">
        <Link to={backRoute}><ArrowLeft className="size-4 mr-2" />Back to questions</Link>
      </Button>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>Failed to load question.</AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && question && (
        <>
          {editQuestion ? (
            <div className="mb-6">
              <QuestionForm
                defaultTitle={question.title}
                defaultBody={question.body}
                submitLabel="Save Changes"
                onSubmit={handleEditQuestion}
                onCancel={() => setEditQuestion(false)}
                isLoading={isSavingQuestion}
              />
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-4 mb-6">
              <div className="flex items-start gap-3">
                <UserAvatar src={question.user?.pictureThumbnail} name={question.user?.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-semibold mb-1">{question.title}</h1>
                  <p className="text-xs text-muted-foreground mb-3">
                    {question.user?.name} · {formatDate(question.updatedAt)}
                  </p>
                  {question.body && (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: question.body }}
                    />
                  )}
                </div>
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`flex items-center gap-1 text-xs h-7 px-2 ${question.upvoted ? 'text-primary' : 'text-muted-foreground'}`}
                    onClick={handleVote}
                  >
                    <CircleArrowUp className="size-4" strokeWidth={question.upvoted ? 2.2 : 2} />
                    {question.upvotes}
                  </Button>
                  {canEditQuestion && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground"
                      onClick={() => setEditQuestion(true)}
                    >
                      <SquarePen className="size-3" />
                    </Button>
                  )}
                  {canDeleteQuestion && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirmDeleteQuestion(true)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <h2 className="font-semibold mb-3">
              {sortedReplies.length} {sortedReplies.length === 1 ? 'Answer' : 'Answers'}
            </h2>
            <div className="space-y-3">
              {sortedReplies.map((reply) => (
                <ReplyCard key={reply.id} reply={reply} questionId={questionId!} />
              ))}
            </div>
          </div>

          <ReplyForm onSubmit={handleAddReply} isLoading={isPosting} />
        </>
      )}

      {!isLoading && !isError && !question && (
        <p className="text-muted-foreground text-center py-12">Question not found.</p>
      )}

      <ConfirmDialog
        open={confirmDeleteQuestion}
        onOpenChange={setConfirmDeleteQuestion}
        title="Delete Question"
        description="Are you sure you want to delete this question and all its replies?"
        onConfirm={handleDeleteQuestion}
        confirmLabel="Delete"
      />
    </div>
  )
}
