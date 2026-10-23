/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_ORIGIN?: string
  readonly VITE_SOCKET_URL?: string
  readonly VITE_COURSE_ID: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_IMAGEKIT_PUBLIC_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
