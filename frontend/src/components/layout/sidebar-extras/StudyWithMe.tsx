import { useState } from 'react'
import { Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'

const STUDY_VIDEOS = [
  {
    id: 'LLf3wPHrKus',
    title: 'Study with me - 2 hours pomodoro',
    description: '2 Hours 50/10 pomodoro with birds sounds or rain',
  },
  {
    id: 'sScDYHeXpvA',
    title: 'Study with me with lofi music',
    description: '2 Hours 25/5 pomodoro with lofi music',
  },
  {
    id: '5vGT-sZlgpo',
    title: '2-hour study with me - calm piano + rain',
    description: '2 Hours 25/5 pomodoro with calm piano and rain sounds',
  },
  {
    id: '497ntkZbUlQ',
    title: '2hr study with me - fire crackling sounds',
    description: '2 Hours 25/5 pomodoro with fire crackling sounds',
  },
]

export function StudyWithMe() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <DialogTrigger asChild>
          <SidebarMenuButton tooltip="Study with me">
            <Timer />
            <span>Study with me</span>
          </SidebarMenuButton>
        </DialogTrigger>
      </SidebarMenuItem>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Study with me</DialogTitle>
          <DialogDescription>
            Pomodoro study sessions with white noise, calm music and more. Focus and get encouraged!
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {STUDY_VIDEOS.map((video) => (
            <div key={video.id}>
              <p className="mb-1 text-sm text-muted-foreground">{video.description}</p>
              <div className="aspect-video w-full overflow-hidden rounded-lg border">
                <iframe
                  title={video.title}
                  src={`https://www.youtube.com/embed/${video.id}`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
