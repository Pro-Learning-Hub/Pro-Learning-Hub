import { Link, useNavigate } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { RegisterForm } from '../components/RegisterForm'
import { GoogleAuthButton } from '../components/GoogleAuthButton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export function RegisterPage() {
  const navigate = useNavigate()
  const handleSuccess = () => navigate('/lectures', { replace: true })

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <BookOpen className="size-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>Join Pro Learning Hub today</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <GoogleAuthButton mode="register" onSuccess={handleSuccess} />
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>
          <RegisterForm onSuccess={handleSuccess} />
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
