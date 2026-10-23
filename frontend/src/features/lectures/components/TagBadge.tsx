import { Badge } from '@/components/ui/badge'

interface TagBadgeProps {
  tag: string
}

export function TagBadge({ tag }: TagBadgeProps) {
  return (
    <Badge variant="secondary" className="text-xs">
      {tag}
    </Badge>
  )
}
