import { z } from 'zod'

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  pictureThumbnail: z.string().nullable().optional(),
  pictureUrl: z.string().nullable().optional(),
  username: z.string().optional(),
})

export const authResponseSchema = z.object({
  message: z.string().optional(),
  accessToken: z.string(),
  user: authUserSchema,
})

export type AuthResponse = z.infer<typeof authResponseSchema>
export type AuthUser = z.infer<typeof authUserSchema>

export const resourceLinkSchema = z.object({
  title: z.string(),
  url: z.string(),
})

export const lectureFormSchema = z.object({
  name: z.string().min(1, 'Lecture name is required'),
  description: z.string().min(1, 'Description is required'),
  tagsInput: z.string().optional(),
  section: z.string().optional(),
  youtubeLink: z.string().optional(),
  notesLink: z.string().optional(),
  slidesLink: z.string().optional(),
  demos: z.array(resourceLinkSchema).default([{ title: '', url: '' }]),
  extras: z.array(resourceLinkSchema).default([{ title: '', url: '' }]),
})

export const createLectureFormSchema = lectureFormSchema.extend({
  section: z.string().min(1, 'Section is required'),
})

export const announcementFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
})

export const questionFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().optional(),
})

export const replyFormSchema = z.object({
  body: z.string().min(1, 'Reply is required'),
})

export type LectureFormValues = z.infer<typeof lectureFormSchema>
export type CreateLectureFormValues = z.infer<typeof createLectureFormSchema>
export type AnnouncementFormValues = z.infer<typeof announcementFormSchema>
export type QuestionFormValues = z.infer<typeof questionFormSchema>
export type ReplyFormValues = z.infer<typeof replyFormSchema>
