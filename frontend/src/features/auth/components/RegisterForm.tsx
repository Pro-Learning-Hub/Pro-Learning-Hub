import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useState } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { loginSuccess } from '@/store/slices/authSlice'
import { http } from '@/lib/http'
import { isImageKitConfigured, uploadToImageKit } from '@/lib/imagekit'
import { setSocketAuthToken } from '@/lib/socket'
import { authResponseSchema } from '@/lib/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Upload } from 'lucide-react'

const schema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

const courseId = import.meta.env.VITE_COURSE_ID

interface RegisterFormProps {
  onSuccess?: () => void
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const dispatch = useAppDispatch()
  const [serverError, setServerError] = useState('')
  const [picture, setPicture] = useState<File | null>(null)
  const [picturePreview, setPicturePreview] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setPicture(file)
    setPicturePreview(file ? URL.createObjectURL(file) : '')
  }

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      let pictureFields: { pictureId: string; pictureURL: string; pictureThumbnail: string } | undefined
      if (picture) {
        const uploaded = await uploadToImageKit(picture)
        pictureFields = {
          pictureId: uploaded.fileId,
          pictureURL: uploaded.url,
          pictureThumbnail: uploaded.thumbnailUrl,
        }
      }

      const json = await http(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            userData: {
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              password: data.password,
              ...pictureFields,
            },
            courseId,
          }),
        },
        authResponseSchema,
      )
      setSocketAuthToken(json.accessToken)
      dispatch(loginSuccess({ user: json.user }))
      toast.success('Account created successfully!')
      onSuccess?.()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {serverError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-1">
        <Label htmlFor="reg-first-name">First Name</Label>
        <Input id="reg-first-name" placeholder="Jane" {...register('firstName')} aria-invalid={!!errors.firstName} />
        {errors.firstName && <p className="text-destructive text-sm">{errors.firstName.message}</p>}
      </div>

      <div className="grid gap-1">
        <Label htmlFor="reg-last-name">Last Name</Label>
        <Input id="reg-last-name" placeholder="Doe" {...register('lastName')} aria-invalid={!!errors.lastName} />
        {errors.lastName && <p className="text-destructive text-sm">{errors.lastName.message}</p>}
      </div>

      <div className="grid gap-1">
        <Label htmlFor="reg-email">Email</Label>
        <Input id="reg-email" type="email" placeholder="you@example.com" {...register('email')} aria-invalid={!!errors.email} />
        {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
      </div>

      <div className="grid gap-1">
        <Label htmlFor="reg-password">Password</Label>
        <Input id="reg-password" type="password" placeholder="••••••••" {...register('password')} aria-invalid={!!errors.password} />
        {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
      </div>

      <div className="grid gap-1">
        <Label htmlFor="reg-confirm">Confirm Password</Label>
        <Input id="reg-confirm" type="password" placeholder="••••••••" {...register('confirmPassword')} aria-invalid={!!errors.confirmPassword} />
        {errors.confirmPassword && <p className="text-destructive text-sm">{errors.confirmPassword.message}</p>}
      </div>

      {isImageKitConfigured() && (
        <div className="grid gap-1">
          <Label htmlFor="reg-picture">Profile Picture (optional)</Label>
          <div className="flex items-center gap-3">
            {picturePreview ? (
              <img src={picturePreview} alt="Preview" className="size-12 rounded-full object-cover" />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Upload className="size-5 text-muted-foreground" />
              </div>
            )}
            <Input
              id="reg-picture"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="file:text-sm"
            />
          </div>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating account…' : 'Create Account'}
      </Button>
    </form>
  )
}
