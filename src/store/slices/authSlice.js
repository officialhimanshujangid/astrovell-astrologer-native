import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { profileApi } from '../../api/services';

// ── Async thunks ──────────────────────────────────────────────────────────────
export const fetchAstrologerProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (astrologerId, { rejectWithValue }) => {
    try {
      const res = await profileApi.get({ astrologerId });
      const d = res.data;
      const astrologer = d?.recordList?.[0] || d?.data || d?.recordList || {};
      return astrologer;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch profile');
    }
  }
);

// ── Slice ──────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    isLoggedIn: false,
    token: null,
    astrologer: null,
    profileCheckLoading: false,
    profileComplete: false,
    chatStatus: 'Offline',
    callStatus: 'Offline',
    globalLang: 'en',
  },
  reducers: {
    loginSuccess: (state, action) => {
      state.isLoggedIn = true;
      state.token = action.payload.token;
      state.astrologer = action.payload.astrologer;
      state.profileComplete = !!(action.payload.astrologer?.name);
      state.chatStatus = action.payload.astrologer?.chatStatus || 'Offline';
      state.callStatus = action.payload.astrologer?.callStatus || 'Offline';
    },
    logout: (state) => {
      state.isLoggedIn = false;
      state.token = null;
      state.astrologer = null;
      state.profileComplete = false;
      state.chatStatus = 'Offline';
      state.callStatus = 'Offline';
      AsyncStorage.removeItem('astrologerToken');
    },
    updateAstrologer: (state, action) => {
      state.astrologer = { ...state.astrologer, ...action.payload };
      state.profileComplete = !!(state.astrologer?.name);
    },
    setChatStatus: (state, action) => {
      state.chatStatus = action.payload;
      if (state.astrologer) state.astrologer.chatStatus = action.payload;
    },
    setCallStatus: (state, action) => {
      state.callStatus = action.payload;
      if (state.astrologer) state.astrologer.callStatus = action.payload;
    },
    setGlobalLang: (state, action) => {
      state.globalLang = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAstrologerProfile.pending, (state) => {
        state.profileCheckLoading = true;
      })
      .addCase(fetchAstrologerProfile.fulfilled, (state, action) => {
        state.profileCheckLoading = false;
        state.astrologer = { ...state.astrologer, ...action.payload };
        state.profileComplete = !!(action.payload?.name);
      })
      .addCase(fetchAstrologerProfile.rejected, (state) => {
        state.profileCheckLoading = false;
      });
  },
});

export const { loginSuccess, logout, updateAstrologer, setChatStatus, setCallStatus, setGlobalLang } = authSlice.actions;
export default authSlice.reducer;
