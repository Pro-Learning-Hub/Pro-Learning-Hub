import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import authReducer from './slices/authSlice'
import uiReducer from './slices/uiSlice'
import syncReducer from './slices/syncSlice'
import { api } from '@/lib/api'

const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['user', 'isLoggedIn'],
}

const syncPersistConfig = {
  key: 'sync',
  storage,
}

const apiPersistConfig = {
  key: 'api',
  storage,
  whitelist: ['queries'],
}

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  ui: uiReducer,
  sync: persistReducer(syncPersistConfig, syncReducer),
  [api.reducerPath]: persistReducer(apiPersistConfig, api.reducer),
})

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/PAUSE', 'persist/FLUSH', 'persist/PURGE', 'persist/REGISTER'],
      },
    }).concat(api.middleware),
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
