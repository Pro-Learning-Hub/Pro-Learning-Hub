import { useCallback, useState } from 'react'
import { toast } from 'sonner'

const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export type MediaType = 'audio' | 'video'
export type TranscriptType = 'transcript' | 'subtitles'

interface UseYtDownloadReturn {
  isTranscriptLoading: boolean
  downloadMedia: (videoUrl: string, mediaType: MediaType) => void
  downloadTranscript: (videoUrl: string, type?: TranscriptType) => Promise<void>
}

export function useYtDownload(): UseYtDownloadReturn {
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false)

  const downloadMedia = useCallback((videoUrl: string, mediaType: MediaType) => {
    if (!videoUrl?.trim()) {
      toast.error(`Please provide a valid YouTube URL for ${mediaType} download.`)
      return
    }

    toast.loading(`Preparing ${mediaType}... Download should start soon.`, {
      id: `media-${mediaType}`,
      duration: 5000,
    })

    const downloadUrl = `${apiBase}/lectures/media?type=${mediaType}&url=${encodeURIComponent(videoUrl)}`
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = downloadUrl
    document.body.appendChild(iframe)

    setTimeout(() => iframe.remove(), 600_000)
  }, [])

  const downloadTranscript = useCallback(
    async (videoUrl: string, type: TranscriptType = 'transcript') => {
      if (!videoUrl?.trim()) {
        toast.error(`Please provide a valid YouTube URL for ${type} download.`)
        return
      }

      const format = type === 'subtitles' ? 'srt' : 'txt'
      setIsTranscriptLoading(true)

      try {
        const response = await fetch(
          `${apiBase}/lectures/transcript?url=${encodeURIComponent(videoUrl)}&format=${encodeURIComponent(format)}`,
        )
        if (!response.ok) {
          throw new Error('Failed to fetch transcript')
        }

        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)
        const fileName =
          decodeURIComponent(response.headers.get('X-File-Name') || '') ||
          (format === 'txt' ? 'transcript.txt' : 'subtitles.srt')

        const link = document.createElement('a')
        link.href = objectUrl
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(objectUrl)

        toast.success('Download started!')
      } catch {
        toast.error(`Error fetching ${type}.`)
      } finally {
        setIsTranscriptLoading(false)
      }
    },
    [],
  )

  return { isTranscriptLoading, downloadMedia, downloadTranscript }
}
