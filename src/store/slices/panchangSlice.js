import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/apiClient';

// ─── Thunk ────────────────────────────────────────────────────────────────────

// Accepts { lang: 'en'|'hi', date?: 'DD/MM/YYYY' }
export const fetchPanchang = createAsyncThunk(
  'panchang/fetch',
  async ({ lang = 'en', date } = {}, { rejectWithValue }) => {
    try {
      const payload = { lang };
      if (date) payload.date = date; // only add date if specified (omitting = today)
      // In astrologer-native, baseURL has /api, so we use /customer/...
      const response = await apiClient.post('/customer/get/panchang', payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const panchangSlice = createSlice({
  name: 'panchang',
  initialState: {
    data: null,
    loading: false,
    error: null,
    lastFetched: null,
  },
  reducers: {
    clearPanchang: (state) => {
      state.data = null;
      state.error = null;
      state.lastFetched = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPanchang.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPanchang.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.status === 200) {
          state.data = action.payload.data;
          state.lastFetched = new Date().toISOString();
        } else {
          state.error = action.payload.message || 'Failed to fetch Panchang';
        }
      })
      .addCase(fetchPanchang.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch Panchang';
      });
  },
});

export const { clearPanchang } = panchangSlice.actions;
export default panchangSlice.reducer;
