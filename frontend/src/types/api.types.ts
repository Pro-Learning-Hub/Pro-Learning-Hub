export interface User {
  id: string
  name: string
  email: string
  picture?: string
  pictureThumbnail?: string
  role: 'student' | 'instructor' | 'admin'
}

export interface ResourceLink {
  title: string
  url: string
}

export interface Lecture {
  id: string
  title: string
  description: string
  videoLink: string
  notes?: string
  slides?: string
  tags: string[]
  demos: ResourceLink[]
  shorts: ResourceLink[]
  quizzez: ResourceLink[]
  sectionId: string
  courseId: string
  updatedAt: string
  createdAt: string
}

export interface Section {
  id: string
  title: string
  lectures: Lecture[]
}

export interface Announcement {
  id: string
  title: string
  body: string
  user: User
  role?: string
  commentsCount: number
  updatedAt: string
  createdAt: string
}

export interface AnnouncementComment {
  id: string
  body: string
  user: User
  announcementId: string
  updatedAt: string
  createdAt: string
}

export interface Question {
  id: string
  title: string
  body: string
  user: User
  upvotes: number
  upvoted: boolean
  repliesCount: number
  lectureId?: string
  courseId?: string
  updatedAt: string
  createdAt: string
}

export interface Reply {
  id: string
  body: string
  user: User
  questionId: string
  upvotes: number
  upvoted: boolean
  updatedAt: string
  createdAt: string
}

export interface LoginResponse {
  accessToken: string
  user: User
}

export interface LectureFormData {
  name: string
  description: string
  tags: string[]
  section: string
  youtubeLink: string
  notesLink: string
  slidesLink: string
  demos: ResourceLink[]
  extras: ResourceLink[]
}
