import React, { Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import { setSocketReady } from '@/store/slices/authSlice'
import { AppLayout } from '@/components/layout/AppLayout'
import { FullPageSpinner } from '@/components/shared/Spinner'
import { SonnerToaster } from '@/components/ui/sonner'

const LoginPage = React.lazy(() =>
  import('./features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage }))
)
const RegisterPage = React.lazy(() =>
  import('./features/auth/pages/RegisterPage').then((m) => ({ default: m.RegisterPage }))
)
const LecturesPage = React.lazy(() =>
  import('./features/lectures/pages/LecturesPage').then((m) => ({ default: m.LecturesPage }))
)
const LecturePage = React.lazy(() =>
  import('./features/lectures/pages/LecturePage').then((m) => ({ default: m.LecturePage }))
)
const CreateLecturePage = React.lazy(() =>
  import('./features/lectures/pages/CreateLecturePage').then((m) => ({ default: m.CreateLecturePage }))
)
const EditLecturePage = React.lazy(() =>
  import('./features/lectures/pages/EditLecturePage').then((m) => ({ default: m.EditLecturePage }))
)
const AnnouncementsPage = React.lazy(() =>
  import('./features/announcements/pages/AnnouncementsPage').then((m) => ({ default: m.AnnouncementsPage }))
)
const GeneralDiscussionPage = React.lazy(() =>
  import('./features/discussion/pages/GeneralDiscussionPage').then((m) => ({ default: m.GeneralDiscussionPage }))
)
const QuestionRepliesPage = React.lazy(() =>
  import('./features/discussion/pages/QuestionRepliesPage').then((m) => ({ default: m.QuestionRepliesPage }))
)

function PrivateRoute() {
  const isLoggedIn = useAppSelector((s) => s.auth.isLoggedIn)
  if (!isLoggedIn) {
    sessionStorage.setItem('intendedPath', window.location.pathname)
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

function useSocketConnection() {
  const isLoggedIn = useAppSelector((s) => s.auth.isLoggedIn)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (isLoggedIn) {
      connectSocket()
        .then(() => dispatch(setSocketReady(true)))
        .catch((err) => {
          console.error('Socket connection failed:', err)
          dispatch(setSocketReady(false))
        })
    } else {
      disconnectSocket()
      dispatch(setSocketReady(false))
    }
  }, [isLoggedIn, dispatch])
}

export default function App() {
  useSocketConnection()

  return (
    <>
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<PrivateRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/lectures" replace />} />
              <Route path="/lectures" element={<LecturesPage />} />
              <Route path="/lectures/new" element={<CreateLecturePage />} />
              <Route path="/lectures/:lectureId" element={<LecturePage />} />
              <Route path="/lectures/:lectureId/edit" element={<EditLecturePage />} />
              <Route path="/announcements" element={<AnnouncementsPage />} />
              <Route path="/discussion" element={<GeneralDiscussionPage />} />
              <Route path="/questions/:questionId" element={<QuestionRepliesPage />} />
            </Route>
          </Route>

          <Route path="*" element={
            <div className="flex h-screen items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-2">404</h1>
                <p className="text-muted-foreground">Page not found</p>
              </div>
            </div>
          } />
        </Routes>
      </Suspense>
      <SonnerToaster richColors position="top-right" />
    </>
  )
}
