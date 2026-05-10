import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/apiClient';

export const fetchLanguages = createAsyncThunk(
  'horoscope/fetchLanguages',
  async (_, { rejectWithValue }) => {
    try {
      // In astrologer-native, baseURL has /api, so we use /customer/...
      const res = await apiClient.post('/customer/getEnabledLanguages', {});
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

export const fetchDailyHoroscope = createAsyncThunk(
  'horoscope/fetchDailyHoroscope',
  async ({ horoscopeSignId, langcode = 'hi' }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/customer/getDailyHoroscope', {
        horoscopeSignId: String(horoscopeSignId),
        langcode
      });
      return { 
        data: res.data, 
        signId: horoscopeSignId, 
        langcode 
      };
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

const horoscopeSlice = createSlice({
  name: 'horoscope',
  initialState: {
    languages: [],
    langsLoad: false,
    
    daily: null,
    dailyLoad: false,
    dailyErr: null,
    
    // Store selected filters
    selectedLang: 'hi',
    selectedSignId: null,
  },
  reducers: {
    setLang: (state, action) => {
      state.selectedLang = action.payload;
    },
    setSign: (state, action) => {
      state.selectedSignId = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLanguages.pending, (s) => { s.langsLoad = true; })
      .addCase(fetchLanguages.fulfilled, (s, a) => {
        s.langsLoad = false;
        s.languages = a.payload.recordList || [];
      })
      .addCase(fetchLanguages.rejected, (s) => { s.langsLoad = false; })
      
      .addCase(fetchDailyHoroscope.pending, (s) => { 
        s.dailyLoad = true; 
        s.dailyErr = null; 
      })
      .addCase(fetchDailyHoroscope.fulfilled, (s, a) => {
        s.dailyLoad = false;
        if (a.payload.data.status === 200) {
           s.daily = a.payload.data.vedicList || null;
        } else {
           s.dailyErr = a.payload.data.message || 'Failed';
        }
        s.selectedSignId = a.payload.signId;
        s.selectedLang = a.payload.langcode;
      })
      .addCase(fetchDailyHoroscope.rejected, (s, a) => {
        s.dailyLoad = false;
        s.dailyErr = a.payload?.message || 'Error occurred';
      });
  }
});

export const { setLang, setSign } = horoscopeSlice.actions;
export default horoscopeSlice.reducer;
