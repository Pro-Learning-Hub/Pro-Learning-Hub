import { Link, useLocation } from 'react-router-dom'
import {
  BookOpen,
  Megaphone,
  MessageSquare,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout } from '@/store/slices/authSlice'
import { clearSync } from '@/store/slices/syncSlice'
import { toggleTheme } from '@/store/slices/uiSlice'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Communities } from './sidebar-extras/Communities'
import { Featured } from './sidebar-extras/Featured'
import { disconnectSocket } from '@/lib/socket'
import { api } from '@/lib/api'
import { http } from '@/lib/http'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'

const navItems = [
  { label: 'Lectures', href: '/lectures', icon: BookOpen },
  { label: 'Announcements', href: '/announcements', icon: Megaphone },
  { label: 'Discussion', href: '/discussion', icon: MessageSquare },
]

export function AppSidebar() {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const user = useAppSelector((s) => s.auth.user)
  const theme = useAppSelector((s) => s.ui.theme)

  const handleLogout = async () => {
    try {
      await http('/auth/logout', { method: 'POST' })
    } catch {
      // cookie is cleared client-side even if the request fails
    }
    disconnectSocket()
    dispatch(api.util.resetApiState())
    dispatch(clearSync())
    dispatch(logout())
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Pro Learning Hub">
              <Link to="/lectures">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <BookOpen className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Pro Learning Hub</span>
                  <span className="truncate text-xs text-muted-foreground">Course workspace</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigate</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ label, href, icon: Icon }) => {
                const isActive =
                  location.pathname === href ||
                  (href !== '/' && location.pathname.startsWith(href))
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                      <Link to={href}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Communities />
        <Featured />
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => dispatch(toggleTheme())}
              tooltip={theme === 'light' ? 'Dark mode' : 'Light mode'}
            >
              {theme === 'light' ? <Moon /> : <Sun />}
              <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip={user.name}>
                <UserAvatar src={user.pictureThumbnail} name={user.name} />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs capitalize text-muted-foreground">{user.role}</span>
                </div>
              </SidebarMenuButton>
              <SidebarMenuAction onClick={handleLogout} title="Logout" aria-label="Logout">
                <LogOut />
              </SidebarMenuAction>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
