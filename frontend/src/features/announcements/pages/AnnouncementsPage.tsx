import { useState, useEffect, useRef } from 'react'
import { CirclePlus } from 'lucide-react'
import { toast } from 'sonner'
import {
  announcementsApi,
  useGetAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useDiffAnnouncementsMutation,
} from '../announcementsApiSlice'
import { AnnouncementCard } from '../components/AnnouncementCard'
import { AnnouncementForm } from '../components/AnnouncementForm'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { getSocket } from '@/lib/socket'
import { upsertById, removeById } from '@/lib/merge'
import { setAnnouncementsLastFetched } from '@/store/slices/syncSlice'
import type { Announcement } from '@/types/api.types'

const courseId = import.meta.env.VITE_COURSE_ID

export function AnnouncementsPage() {
  const userRole = useAppSelector((s) => s.auth.user?.role)
  const isSocketReady = useAppSelector((s) => s.auth.isSocketReady)
  const dispatch = useAppDispatch()
  const [showForm, setShowForm] = useState(false)
  const didDiff = useRef(false)

  const { data, isLoading, isError } = useGetAnnouncementsQuery()
  const [createAnnouncement] = useCreateAnnouncementMutation()
  const [diffAnnouncements] = useDiffAnnouncementsMutation()

  useEffect(() => {
    const socket = getSocket()
    if (socket && courseId) {
      const room = `announcements-${courseId}`
      socket.emit('joinRoom', room)
      return () => { socket.emit('leaveRoom', room) }
    }
  }, [isSocketReady])

  useEffect(() => {
    if (didDiff.current || !data?.announcements?.length) {
      return
    }
    didDiff.current = true
    void diffAnnouncements(
      data.announcements.map((announcement) => ({
        id: announcement.id,
        updatedAt: announcement.updatedAt,
      })),
    )
  }, [data?.announcements, diffAnnouncements])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const patch = (updater: (announcements: Announcement[]) => Announcement[], lastFetched?: string) => {
      dispatch(
        announcementsApi.util.updateQueryData('getAnnouncements', undefined, (draft) => {
          draft.announcements = updater(draft.announcements)
          if (lastFetched) {
            draft.lastFetched = lastFetched
          }
        }),
      )
      if (lastFetched) {
        dispatch(setAnnouncementsLastFetched(lastFetched))
      }
    }

    const onCreated = ({ payload, lastFetched }: { payload: Announcement; lastFetched?: string }) => {
      patch((announcements) => upsertById(announcements, payload), lastFetched)
    }
    const onDeleted = ({ payload }: { payload: { announcementId: string } }) => {
      patch((announcements) => removeById(announcements, payload.announcementId))
    }
    const onUpdated = ({ payload }: { payload: { updatedAnnouncement: Announcement } }) => {
      patch((announcements) => upsertById(announcements, payload.updatedAnnouncement))
    }

    socket.on('announcementCreated', onCreated)
    socket.on('announcementDeleted', onDeleted)
    socket.on('announcementUpdated', onUpdated)
    return () => {
      socket.off('announcementCreated', onCreated)
      socket.off('announcementDeleted', onDeleted)
      socket.off('announcementUpdated', onUpdated)
    }
  }, [dispatch, isSocketReady])

  const handleCreate = async (title: string, body: string) => {
    try {
      await createAnnouncement({ title, body }).unwrap()
      toast.success('Announcement posted')
      setShowForm(false)
    } catch {
      toast.error('Failed to create announcement')
    }
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Announcements</h1>
        {userRole && userRole !== 'student' && !showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <CirclePlus className="size-4" />
            New Announcement
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <AnnouncementForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>Failed to load announcements.</AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && (
        <div className="space-y-4">
          {data?.announcements?.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No announcements yet.</p>
          ) : (
            data?.announcements?.map((ann) => (
              <AnnouncementCard key={ann.id} announcement={ann} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
