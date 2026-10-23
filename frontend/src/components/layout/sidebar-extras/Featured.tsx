import { Sparkles } from 'lucide-react'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { StudyWithMe } from './StudyWithMe'

const FEATURED_LINKS = [
  {
    name: 'Notion',
    url: 'https://www.notion.so/',
    icon: 'https://www.notion.com/front-static/favicon.ico',
  },
  {
    name: 'Tic Tic',
    url: 'https://ticktick.com/webapp/#q/all/habit',
    icon: 'https://img.icons8.com/fluency/48/tick-tick.png',
  },
  {
    name: 'Learn How To Learn for Youth',
    url: 'https://www.coursera.org/learn/learning-how-to-learn-youth/',
    icon: 'https://d3njjcbhbojbot.cloudfront.net/web/images/favicons/favicon-v2-32x32.png',
  },
  {
    name: 'Learn How To Learn',
    url: 'https://www.coursera.org/learn/learning-how-to-learn',
    icon: 'https://d3njjcbhbojbot.cloudfront.net/web/images/favicons/favicon-v2-32x32.png',
  },
  {
    name: 'Flocus',
    url: 'https://flocus.com/',
    icon: 'https://flocus.com/resources/assets/favicon.jpg',
  },
  {
    name: 'Study Together',
    url: 'https://studytogether.com/',
    icon: 'https://cdn.prod.website-files.com/60890f6ac44206aef9237eb4/60bf58e7f22ec73793160127_Favicon-small.png',
  },
  {
    name: 'Forest',
    url: 'https://forestapp.cc',
    icon: 'https://www.forestapp.cc/favicon.ico',
  },
  {
    name: 'SleepTown',
    url: 'https://sleeptown.seekrtech.com/',
    icon: 'https://sleeptown.seekrtech.com/img/icon_128_round.png',
  },
  {
    name: 'RemindMe',
    url: 'https://remindme-l.vercel.app',
    icon: 'https://custom-images.strikinglycdn.com/res/hrscywv4p/image/upload/17746265/ai_logo_1726750030_AyBzw8.png',
  },
]

export function Featured() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <Sparkles className="mr-1 size-4" />
        Featured
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {FEATURED_LINKS.map(({ name, url, icon }) => (
            <SidebarMenuItem key={name}>
              <SidebarMenuButton asChild tooltip={name}>
                <a href={url} target="_blank" rel="noreferrer">
                  <img src={icon} alt="" className="size-4 shrink-0 rounded-sm" />
                  <span className="truncate">{name}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <StudyWithMe />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
