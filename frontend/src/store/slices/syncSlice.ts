import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface SyncState {
  sectionsLastFetchedAt: string | null
  sectionsLastSyncedAt: string | null
  announcementsLastFetchedAt: string | null
  generalDiscussionLastFetchedAt: string | null
  lectureDiscussionsLastFetchedAt: Record<string, string>
  repliesLastFetchedAt: Record<string, string>
}

const initialState: SyncState = {
  sectionsLastFetchedAt: null,
  sectionsLastSyncedAt: null,
  announcementsLastFetchedAt: null,
  generalDiscussionLastFetchedAt: null,
  lectureDiscussionsLastFetchedAt: {},
  repliesLastFetchedAt: {},
}

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setSectionsLastFetched(state, action: PayloadAction<string>) {
      state.sectionsLastFetchedAt = action.payload
      if (!state.sectionsLastSyncedAt) {
        state.sectionsLastSyncedAt = action.payload
      }
    },
    setSectionsLastSynced(state, action: PayloadAction<string>) {
      state.sectionsLastSyncedAt = action.payload
      state.sectionsLastFetchedAt = action.payload
    },
    setAnnouncementsLastFetched(state, action: PayloadAction<string>) {
      state.announcementsLastFetchedAt = action.payload
    },
    setGeneralDiscussionLastFetched(state, action: PayloadAction<string>) {
      state.generalDiscussionLastFetchedAt = action.payload
    },
    setLectureDiscussionLastFetched(
      state,
      action: PayloadAction<{ lectureId: string; lastFetched: string }>,
    ) {
      state.lectureDiscussionsLastFetchedAt[action.payload.lectureId] = action.payload.lastFetched
    },
    setRepliesLastFetched(
      state,
      action: PayloadAction<{ questionId: string; lastFetched: string }>,
    ) {
      state.repliesLastFetchedAt[action.payload.questionId] = action.payload.lastFetched
    },
    clearSync() {
      return initialState
    },
  },
})

export const {
  setSectionsLastFetched,
  setSectionsLastSynced,
  setAnnouncementsLastFetched,
  setGeneralDiscussionLastFetched,
  setLectureDiscussionLastFetched,
  setRepliesLastFetched,
  clearSync,
} = syncSlice.actions

export default syncSlice.reducer
