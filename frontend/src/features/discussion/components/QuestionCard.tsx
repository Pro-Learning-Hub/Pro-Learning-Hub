import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleArrowUp, MessageSquare, EllipsisVertical, SquarePen, Trash2 } from 'lucide-react'
import type { Question } from '@/types/api.types'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { QuestionForm } from './QuestionForm'
import { formatDate } from '@/lib/utils'
import { useAppSelector } from '@/store/hooks'
import {
  useToggleQuestionVoteMutation,
  useUpdateQuestionMutation,
  useDeleteQuestionMutation,
} from '../discussionApiSlice'
import { toast } from 'sonner'

interface QuestionCardProps {
  question: Question
  backRoute?: string
  lectureId?: string
}

export function QuestionCard({ question, backRoute = '/discussion', lectureId }: QuestionCardProps) {
  const userId = useAppSelector((s) => s.auth.user?.id)
  const userRole = useAppSelector((s) => s.auth.user?.role)
  const [toggleVote] = useToggleQuestionVoteMutation()
  const [updateQuestion, { isLoading: isSaving }] = useUpdateQuestionMutation()
  const [deleteQuestion] = useDeleteQuestionMutation()
  const [editMode, setEditMode] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const effectiveLectureId = lectureId ?? question.lectureId
  const isOwner = userId === question.user?.id
  const canEdit = isOwner
  const canDelete = userRole !== 'student' || isOwner

  const handleVote = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await toggleVote({
        questionId: question.id,
        lectureId: effectiveLectureId,
        action: question.upvoted ? 'downvote' : 'upvote',
      }).unwrap()
    } catch {
      toast.error('Failed to toggle vote')
    }
  }

  const handleEdit = async (title: string, body: string) => {
    try {
      await updateQuestion({
        questionId: question.id,
        title,
        body,
        lectureId: effectiveLectureId,
      }).unwrap()
      toast.success('Question updated')
      setEditMode(false)
    } catch {
      toast.error('Failed to update question')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteQuestion({ questionId: question.id, lectureId: effectiveLectureId }).unwrap()
      toast.success('Question deleted')
    } catch {
      toast.error('Failed to delete question')
    }
  }

  if (editMode) {
    return (
      <QuestionForm
        defaultTitle={question.title}
        defaultBody={question.body}
        submitLabel="Save Changes"
        onSubmit={handleEdit}
        onCancel={() => setEditMode(false)}
        isLoading={isSaving}
      />
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
      <UserAvatar
        src={question.user?.pictureThumbnail}
        name={question.user?.name}
        size="md"
      />

      <div className="flex-1 min-w-0">
        <Link
          to={`/questions/${question.id}`}
          state={{ backRoute }}
          className="block"
        >
          <h3 className="font-medium text-sm hover:text-primary transition-colors">
            {question.title}
          </h3>
          {question.body && (
            <div
              className="mt-1 text-xs text-muted-foreground line-clamp-2 prose prose-xs"
              dangerouslySetInnerHTML={{ __html: question.body }}
            />
          )}
        </Link>

        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{question.user?.name}</span>
          <span>·</span>
          <span>{formatDate(question.updatedAt)}</span>
        </div>
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

        <Link
          to={`/questions/${question.id}`}
          state={{ backRoute }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageSquare className="size-3" />
          {question.repliesCount}
        </Link>

        {(canEdit || canDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground">
                <EllipsisVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem onClick={() => setEditMode(true)}>
                  <SquarePen className="size-4 mr-2" />Edit question
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="size-4 mr-2" />Delete question
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete Question"
        description="Are you sure you want to delete this question and all its replies?"
        onConfirm={handleDelete}
        confirmLabel="Delete"
      />
    </div>
  )
}
