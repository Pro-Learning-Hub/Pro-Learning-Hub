import { Link, useNavigate } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { useState } from 'react'
import { LoginForm } from '../components/LoginForm'
import { GoogleAuthButton } from '../components/GoogleAuthButton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export function LoginPage() {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)

  const handleSuccess = () => {
    const intended = sessionStorage.getItem('intendedPath') || '/lectures'
    sessionStorage.removeItem('intendedPath')
    navigate(intended, { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <BookOpen className="size-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your Pro Learning Hub account</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <GoogleAuthButton mode="login" isAdmin={isAdmin} onSuccess={handleSuccess} />
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>
          <LoginForm isAdmin={isAdmin} onAdminChange={setIsAdmin} onSuccess={handleSuccess} />
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
