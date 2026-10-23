import type { ResourceLink } from '@/types/api.types'
import { ExternalLink } from 'lucide-react'

interface ResourceListProps {
  resources: ResourceLink[]
  emptyLabel?: string
}

export function ResourceList({ resources, emptyLabel = 'None available' }: ResourceListProps) {
  if (!resources || resources.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">{emptyLabel}</p>
  }

  return (
    <ul className="flex flex-col gap-1">
      {resources.map((r, i) => (
        <li key={i}>
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="size-3 shrink-0" />
            {r.title || r.url}
          </a>
        </li>
      ))}
    </ul>
  )
}
