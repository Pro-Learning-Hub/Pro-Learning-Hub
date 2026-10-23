import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SpinnerProps {
  className?: string
  size?: number
}

export function Spinner({ className, size = 24 }: SpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin text-muted-foreground', className)}
      size={size}
    />
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex h-64 w-full items-center justify-center">
      <Spinner size={40} />
    </div>
  )
}
