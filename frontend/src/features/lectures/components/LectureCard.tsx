import { Link } from 'react-router-dom'
import { Presentation, EllipsisVertical, SquarePen, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Lecture } from '@/types/api.types'
import { TagBadge } from './TagBadge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useDeleteLectureMutation } from '../lecturesApiSlice'
import { toast } from 'sonner'
import { useAppSelector } from '@/store/hooks'

interface LectureCardProps {
  lecture: Lecture
}

export function LectureCard({ lecture }: LectureCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const userRole = useAppSelector((s) => s.auth.user?.role)
  const [deleteLecture] = useDeleteLectureMutation()

  const processedTags = Array.isArray(lecture.tags)
    ? lecture.tags
    : typeof lecture.tags === 'string'
    ? (lecture.tags as string).split(',').map((t) => t.trim()).filter(Boolean)
    : []

  const handleDelete = async () => {
    try {
      await deleteLecture({ lectureId: lecture.id, sectionId: lecture.sectionId }).unwrap()
      toast.success('Lecture deleted')
    } catch {
      toast.error('Failed to delete lecture')
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
        <Presentation className="size-5 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/lectures/${lecture.id}`}
            className="font-medium text-sm hover:text-primary transition-colors line-clamp-2"
          >
            {lecture.title}
          </Link>

          {userRole && userRole !== 'student' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7 shrink-0">
                  <EllipsisVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={`/lectures/${lecture.id}/edit`} className="flex items-center gap-2">
                    <SquarePen className="size-4" />
                    Edit Lecture
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setConfirmOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="size-4" />
                  Delete Lecture
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {lecture.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {lecture.description}
          </p>
        )}

        {processedTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {processedTags.map((tag, i) => (
              <TagBadge key={`${i}-${tag}`} tag={tag} />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Lecture"
        description={`Are you sure you want to delete "${lecture.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
      />
    </div>
  )
}
