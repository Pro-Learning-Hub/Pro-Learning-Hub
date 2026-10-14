import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAppDispatch } from '@/store/hooks'
import { loginSuccess } from '@/store/slices/authSlice'
import { http } from '@/lib/http'
import { setSocketAuthToken } from '@/lib/socket'
import { authResponseSchema } from '@/lib/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useState } from 'react'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  isAdmin: z.boolean().optional(),
})

type FormData = z.infer<typeof schema>

const courseId = import.meta.env.VITE_COURSE_ID

interface LoginFormProps {
  onSuccess?: () => void
  isAdmin: boolean
  onAdminChange: (value: boolean) => void
}

export function LoginForm({ onSuccess, isAdmin, onAdminChange }: LoginFormProps) {
  const dispatch = useAppDispatch()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    const url = isAdmin ? '/auth/admin/login' : '/auth/login'

    try {
      const json = await http(
        url,
        {
          method: 'POST',
          body: JSON.stringify({ email: data.email, password: data.password, courseId }),
        },
        authResponseSchema,
      )
      setSocketAuthToken(json.accessToken)
      dispatch(loginSuccess({ user: json.user }))
      toast.success('Welcome back!')
      onSuccess?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setServerError(msg)
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
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          {...register('email')}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="text-destructive text-sm">{errors.email.message}</p>
        )}
      </div>

      <div className="grid gap-1">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register('password')}
          aria-invalid={!!errors.password}
        />
        {errors.password && (
          <p className="text-destructive text-sm">{errors.password.message}</p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={isAdmin}
          onChange={(e) => onAdminChange(e.target.checked)}
          className="rounded border-input"
        />
        Sign in as Admin
      </label>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign In'}
      </Button>
    </form>
  )
}
