import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface UIState {
  isLoading: boolean
  theme: 'light' | 'dark'
  sidebarOpen: boolean
}

const initialState: UIState = {
  isLoading: false,
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  sidebarOpen: true,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload
    },
    toggleTheme(state) {
      state.theme = state.theme === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', state.theme)
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload
    },
  },
})

export const { setLoading, toggleTheme, setSidebarOpen } = uiSlice.actions
export default uiSlice.reducer
