import { http } from '@/lib/http'

const publicKey = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY

interface ImageKitAuthParams {
  token: string
  expire: number
  signature: string
}

export interface ImageKitUploadResult {
  fileId: string
  url: string
  thumbnailUrl: string
}

export function isImageKitConfigured(): boolean {
  return Boolean(publicKey)
}

export async function uploadToImageKit(file: File): Promise<ImageKitUploadResult> {
  if (!publicKey) {
    throw new Error('Image upload is not configured')
  }

  const auth = await http<ImageKitAuthParams>('/auth/imagekit')

  const form = new FormData()
  form.append('file', file)
  form.append('fileName', file.name)
  form.append('publicKey', publicKey)
  form.append('token', auth.token)
  form.append('expire', String(auth.expire))
  form.append('signature', auth.signature)

  const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    body: form,
  })
  if (!response.ok) {
    throw new Error('Image upload failed')
  }

  const data = (await response.json()) as ImageKitUploadResult
  return { fileId: data.fileId, url: data.url, thumbnailUrl: data.thumbnailUrl }
}
