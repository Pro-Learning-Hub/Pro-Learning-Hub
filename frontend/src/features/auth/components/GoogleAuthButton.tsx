import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { toast } from 'sonner'
import { useAppDispatch } from '@/store/hooks'
import { loginSuccess } from '@/store/slices/authSlice'
import { http } from '@/lib/http'
import { setSocketAuthToken } from '@/lib/socket'
import { authResponseSchema } from '@/lib/schemas'

const courseId = import.meta.env.VITE_COURSE_ID

interface GoogleAuthButtonProps {
  mode: 'login' | 'register'
  isAdmin?: boolean
  onSuccess?: () => void
}

export function GoogleAuthButton({ mode, isAdmin = false, onSuccess }: GoogleAuthButtonProps) {
  const dispatch = useAppDispatch()

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      toast.error('Google sign in failed')
      return
    }

    try {
      let url: string
      if (mode === 'register') {
        url = '/auth/oauth/googleRegister'
      } else if (isAdmin) {
        url = '/auth/admin/oauth/google'
      } else {
        url = '/auth/oauth/google'
      }

      const json = await http(
        url,
        {
          method: 'POST',
          body: JSON.stringify({ token: response.credential, courseId }),
        },
        authResponseSchema,
      )
      setSocketAuthToken(json.accessToken)
      dispatch(loginSuccess({ user: json.user }))
      toast.success('Signed in with Google!')
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Google auth failed')
    }
  }

  return (
    <div className="flex w-full justify-center">
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={() => toast.error('Google sign in failed')}
        text={mode === 'register' ? 'signup_with' : 'signin_with'}
        width="352"
      />
    </div>
  )
}
