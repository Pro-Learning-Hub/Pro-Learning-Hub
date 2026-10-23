import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Download } from 'lucide-react'
import { lecturesApi, useGetLectureQuery } from '../lecturesApiSlice'
import { ResourceList } from '../components/ResourceList'
import { TagBadge } from '../components/TagBadge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AlertCircle } from 'lucide-react'
import { extractVideoId } from '@/lib/utils'
import { LectureDiscussionPage } from '../../discussion/pages/LectureDiscussionPage'
import { useEffect } from 'react'
import { getSocket } from '@/lib/socket'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { useYtDownload } from '../hooks/useYtDownload'
import type { Lecture } from '@/types/api.types'

export function LecturePage() {
  const { lectureId } = useParams<{ lectureId: string }>()
  const navigate = useNavigate()
  const isSocketReady = useAppSelector((s) => s.auth.isSocketReady)
  const dispatch = useAppDispatch()
  const userRole = useAppSelector((s) => s.auth.user?.role)

  const { data, isLoading, isError } = useGetLectureQuery(lectureId ?? '', {
    skip: !lectureId,
  })
  const lecture = data?.lectureData

  // Join lecture room
  useEffect(() => {
    const socket = getSocket()
    if (socket && lectureId) {
      socket.emit('joinRoom', `lecture-${lectureId}`)
      return () => { socket.emit('leaveRoom', `lecture-${lectureId}`) }
    }
  }, [lectureId, isSocketReady])

  // Real-time: if lecture is deleted, navigate away
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !lectureId) return
    const handleDeleted = ({ payload }: { payload: { lectureId: string } }) => {
      if (payload.lectureId === lectureId) {
        navigate('/lectures', { replace: true })
      }
    }
    const handleUpdated = ({ payload }: { payload: { updatedLecture: Lecture } }) => {
      dispatch(
        lecturesApi.util.updateQueryData('getLecture', lectureId, (draft) => {
          draft.lectureData = { ...draft.lectureData, ...payload.updatedLecture }
        }),
      )
    }
    socket.on('lectureDeleted', handleDeleted)
    socket.on('lectureUpdated', handleUpdated)
    return () => {
      socket.off('lectureDeleted', handleDeleted)
      socket.off('lectureUpdated', handleUpdated)
    }
  }, [lectureId, navigate, dispatch, isSocketReady])

  const videoId = lecture ? extractVideoId(lecture.videoLink) : null

  const { downloadMedia, downloadTranscript, isTranscriptLoading } = useYtDownload()

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="aspect-video w-full rounded-lg" />
      </div>
    )
  }

  if (isError || !lecture) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>Lecture not found or could not be loaded.</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/lectures"><ArrowLeft className="size-4 mr-2" />Back to Lectures</Link>
        </Button>
      </div>
    )
  }

  const tags = Array.isArray(lecture.tags)
    ? lecture.tags
    : typeof lecture.tags === 'string'
    ? (lecture.tags as string).split(',').map((t) => t.trim()).filter(Boolean)
    : []

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Button asChild variant="ghost" className="mb-4 -ml-2">
        <Link to="/lectures"><ArrowLeft className="size-4 mr-2" />Back</Link>
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{lecture.title}</h1>
        {lecture.description && (
          <p className="text-muted-foreground mb-3">{lecture.description}</p>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag, i) => <TagBadge key={i} tag={tag} />)}
          </div>
        )}
        {userRole && userRole !== 'student' && (
          <div className="mt-3">
            <Button asChild variant="outline" size="sm">
              <Link to={`/lectures/${lectureId}/edit`}>Edit Lecture</Link>
            </Button>
          </div>
        )}
      </div>

      {/* YouTube Embed */}
      {videoId && (
        <div className="mb-6 aspect-video w-full overflow-hidden rounded-lg border">
          <iframe
            title={lecture.title}
            src={`https://www.youtube.com/embed/${videoId}`}
            className="h-full w-full"
            allowFullScreen
          />
        </div>
      )}

      <Separator className="my-6" />

      <Tabs defaultValue="resources">
        <TabsList className="mb-4">
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
          <TabsTrigger value="extras">Shorts & Extras</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
        </TabsList>

        <TabsContent value="resources">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Notes & Slides</h3>
              <div className="flex flex-wrap gap-2">
                {lecture.notes && (
                  <Button asChild variant="outline" size="sm">
                    <a href={lecture.notes} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3 mr-1" />Notes
                    </a>
                  </Button>
                )}
                {lecture.slides && (
                  <Button asChild variant="outline" size="sm">
                    <a href={lecture.slides} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3 mr-1" />Slides
                    </a>
                  </Button>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Downloads</h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!lecture.videoLink}
                  onClick={() => lecture.videoLink && downloadMedia(lecture.videoLink, 'audio')}
                >
                  <Download className="size-3 mr-1" />Audio
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!lecture.videoLink}
                  onClick={() => lecture.videoLink && downloadMedia(lecture.videoLink, 'video')}
                >
                  <Download className="size-3 mr-1" />Video
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!lecture.videoLink || isTranscriptLoading}
                  onClick={() => lecture.videoLink && downloadTranscript(lecture.videoLink, 'transcript')}
                >
                  <Download className="size-3 mr-1" />Transcript
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!lecture.videoLink || isTranscriptLoading}
                  onClick={() => lecture.videoLink && downloadTranscript(lecture.videoLink, 'subtitles')}
                >
                  <Download className="size-3 mr-1" />Subtitles
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Demos</h3>
              <ResourceList resources={lecture.demos} emptyLabel="No demos available" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="discussion">
          {lectureId && <LectureDiscussionPage lectureId={lectureId} />}
        </TabsContent>

        <TabsContent value="extras">
          <ResourceList resources={lecture.shorts} emptyLabel="No shorts/extras available" />
        </TabsContent>

        <TabsContent value="quizzes">
          <ResourceList resources={lecture.quizzez} emptyLabel="No quizzes available" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
