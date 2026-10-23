import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface UserAvatarProps {
  src?: string
  name?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'size-6',
  md: 'size-8',
  lg: 'size-10',
}

export function UserAvatar({ src, name, className, size = 'md' }: UserAvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  return (
    <Avatar className={`${sizeClasses[size]} ${className ?? ''}`}>
      <AvatarImage src={src} alt={name ?? 'User'} />
      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
    </Avatar>
  )
}
