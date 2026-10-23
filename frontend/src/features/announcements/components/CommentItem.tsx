import { useState } from 'react'
import { SquarePen, Trash2 } from 'lucide-react'
import type { AnnouncementComment } from '@/types/api.types'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useAppSelector } from '@/store/hooks'
import { useUpdateAnnouncementCommentMutation, useDeleteAnnouncementCommentMutation } from '../announcementsApiSlice'
import { toast } from 'sonner'

interface CommentItemProps {
  comment: AnnouncementComment
  announcementId: string
}

export function CommentItem({ comment, announcementId }: CommentItemProps) {
  const userId = useAppSelector((s) => s.auth.user?.id)
  const userRole = useAppSelector((s) => s.auth.user?.role)
  const [editMode, setEditMode] = useState(false)
  const [value, setValue] = useState(comment.body)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [updateComment, { isLoading: isSaving }] = useUpdateAnnouncementCommentMutation()
  const [deleteComment] = useDeleteAnnouncementCommentMutation()

  const isOwner = userId === comment.user?.id
  const canDelete = userRole !== 'student' || isOwner

  const handleSave = async () => {
    if (!value.trim()) return
    try {
      await updateComment({ commentId: comment.id, announcementId, body: value.trim() }).unwrap()
      setEditMode(false)
    } catch {
      toast.error('Failed to update comment')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteComment({ commentId: comment.id, announcementId }).unwrap()
      toast.success('Comment deleted')
    } catch {
      toast.error('Failed to delete comment')
    }
  }

  return (
    <div className="flex items-start gap-2 text-sm">
      <UserAvatar src={comment.user?.pictureThumbnail} name={comment.user?.name} size="sm" />
      <div className="flex-1 min-w-0">
        <span className="font-medium">{comment.user?.name}</span>
        {editMode ? (
          <div className="mt-1 flex items-center gap-2">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') { setEditMode(false); setValue(comment.body) }
              }}
              className="h-8"
            />
            <Button size="sm" variant="outline" disabled={isSaving} onClick={handleSave}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setEditMode(false); setValue(comment.body) }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground ml-2">{comment.body}</span>
        )}
      </div>

      {!editMode && (
        <div className="flex items-center shrink-0">
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              onClick={() => setEditMode(true)}
            >
              <SquarePen className="size-3" />
            </Button>
          )}
          {canDelete && (
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
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete Comment"
        description="Are you sure you want to delete this comment?"
        onConfirm={handleDelete}
        confirmLabel="Delete"
      />
    </div>
  )
}
