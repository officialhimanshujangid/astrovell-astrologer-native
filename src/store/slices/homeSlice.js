import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/apiClient';

export const fetchHoroscopeSign = createAsyncThunk(
  'home/fetchHoroscopeSign',
  async (_, { rejectWithValue }) => {
    try {
      // In astrologer-native, baseURL has /api, so we use /customer/...
      const res = await apiClient.post('/customer/getHororscopeSign', {});
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

const homeSlice = createSlice({
  name: 'home',
  initialState: {
    horoscopeSigns:   [],
    signsLoad:        false,
    signsErr:         null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHoroscopeSign.pending,   (s) => { s.signsLoad = true;  s.signsErr = null; })
      .addCase(fetchHoroscopeSign.fulfilled, (s, a) => {
        s.signsLoad      = false;
        s.horoscopeSigns = a.payload.recordList || [];
      })
      .addCase(fetchHoroscopeSign.rejected,  (s, a) => {
        s.signsLoad = false;
        s.signsErr  = a.payload?.message || 'Failed to load signs';
      });
  },
});

export default homeSlice.reducer;
