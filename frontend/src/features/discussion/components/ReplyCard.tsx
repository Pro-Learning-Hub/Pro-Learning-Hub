import { useState } from 'react'
import { CircleArrowUp, SquarePen, Trash2 } from 'lucide-react'
import type { Reply } from '@/types/api.types'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/utils'
import {
  useToggleReplyVoteMutation,
  useUpdateReplyMutation,
  useDeleteReplyMutation,
} from '../discussionApiSlice'
import { useAppSelector } from '@/store/hooks'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

interface ReplyCardProps {
  reply: Reply
  questionId: string
}

export function ReplyCard({ reply, questionId }: ReplyCardProps) {
  const userId = useAppSelector((s) => s.auth.user?.id)
  const userRole = useAppSelector((s) => s.auth.user?.role)
  const [toggleVote] = useToggleReplyVoteMutation()
  const [updateReply, { isLoading: isSaving }] = useUpdateReplyMutation()
  const [deleteReply] = useDeleteReplyMutation()
  const [editMode, setEditMode] = useState(false)
  const [editBody, setEditBody] = useState(reply.body)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isOwner = userId === reply.user?.id
  const canDelete = userRole !== 'student' || isOwner

  const handleVote = async () => {
    try {
      await toggleVote({
        replyId: reply.id,
        questionId,
        action: reply.upvoted ? 'downvote' : 'upvote',
      }).unwrap()
    } catch {
      toast.error('Failed to toggle vote')
    }
  }

  const handleSave = async () => {
    if (!editBody.trim()) return
    try {
      await updateReply({ replyId: reply.id, questionId, body: editBody.trim() }).unwrap()
      toast.success('Reply updated')
      setEditMode(false)
    } catch {
      toast.error('Failed to update reply')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteReply({ replyId: reply.id, questionId }).unwrap()
      toast.success('Reply deleted')
    } catch {
      toast.error('Failed to delete reply')
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
      <UserAvatar src={reply.user?.pictureThumbnail} name={reply.user?.name} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{reply.user?.name}</span>
          <span className="text-xs text-muted-foreground">{formatDate(reply.updatedAt)}</span>
        </div>
        {editMode ? (
          <div className="space-y-2">
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="min-h-24"
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setEditMode(false); setEditBody(reply.body) }}
              >
                Cancel
              </Button>
              <Button size="sm" disabled={isSaving} onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="text-sm prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: reply.body }}
          />
        )}
      </div>

      <div className="flex flex-col items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-1 text-xs h-7 px-2 ${reply.upvoted ? 'text-primary' : 'text-muted-foreground'}`}
          onClick={handleVote}
        >
          <CircleArrowUp className="size-4" strokeWidth={reply.upvoted ? 2.2 : 2} />
          {reply.upvotes}
        </Button>
        {!editMode && isOwner && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            onClick={() => setEditMode(true)}
          >
            <SquarePen className="size-3" />
          </Button>
        )}
        {!editMode && canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-3" />
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete Reply"
        description="Are you sure you want to delete this reply?"
        onConfirm={handleDelete}
        confirmLabel="Delete"
      />
    </div>
  )
}
