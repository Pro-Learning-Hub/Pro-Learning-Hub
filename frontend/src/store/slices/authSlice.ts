import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { User } from '@/types/api.types'
import type { AuthUser } from '@/lib/schemas'

interface AuthState {
  user: User | null
  isLoggedIn: boolean
  isSocketReady: boolean
}

const initialState: AuthState = {
  user: null,
  isLoggedIn: false,
  isSocketReady: false,
}

function toUser(user: AuthUser | User): User {
  if ('name' in user && user.name) {
    return user
  }
  const authUser = user as AuthUser
  return {
    id: authUser.id,
    name: `${authUser.firstName} ${authUser.lastName}`.trim(),
    email: authUser.email,
    picture: authUser.pictureUrl ?? undefined,
    pictureThumbnail: authUser.pictureThumbnail ?? undefined,
    role: (authUser.role as User['role']) || 'student',
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action: PayloadAction<{ user: AuthUser | User }>) {
      state.user = toUser(action.payload.user)
      state.isLoggedIn = true
    },
    logout(state) {
      state.user = null
      state.isLoggedIn = false
      state.isSocketReady = false
    },
    setSocketReady(state, action: PayloadAction<boolean>) {
      state.isSocketReady = action.payload
    },
  },
})

export const { loginSuccess, logout, setSocketReady } = authSlice.actions
export default authSlice.reducer
