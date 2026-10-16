import { Users, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const COMMUNITY_LINKS = [
  { name: 'Bluesky', url: 'https://cs50.bsky.social', badge: null },
  { name: 'Clubhouse', url: 'https://www.clubhouse.com/club/cs50', badge: null },
  { name: 'Discord', url: 'https://discord.gg/cs50', badge: 'Q&A' },
  { name: 'Ed', url: 'https://cs50.edx.org/ed', badge: 'Q&A' },
  { name: 'Facebook Group', url: 'https://www.facebook.com/groups/cs50/', badge: 'Q&A' },
  { name: 'Facebook Page', url: 'https://www.facebook.com/cs50/', badge: null },
  { name: 'GitHub', url: 'https://github.com/cs50', badge: null },
  { name: 'Gitter', url: 'https://gitter.im/cs50/x', badge: 'Q&A' },
  { name: 'Instagram', url: 'https://instagram.com/cs50', badge: null },
]

export function Communities() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <Users className="mr-1 size-4" />
        Communities
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {COMMUNITY_LINKS.map(({ name, url, badge }) => (
            <SidebarMenuItem key={name}>
              <SidebarMenuButton asChild tooltip={name}>
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  <span className="flex-1 truncate">{name}</span>
                  {badge && (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      {badge}
                    </Badge>
                  )}
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
