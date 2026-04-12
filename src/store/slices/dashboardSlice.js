import { createSlice } from '@reduxjs/toolkit';

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    chatRequests: [],
    callRequests: [],
    boostInfo: null,
    loading: false,
  },
  reducers: {
    setChatRequests: (state, action) => { state.chatRequests = action.payload; },
    setCallRequests: (state, action) => { state.callRequests = action.payload; },
    removeChatRequest: (state, action) => {
      state.chatRequests = state.chatRequests.filter(r => r.id !== action.payload);
    },
    removeCallRequest: (state, action) => {
      state.callRequests = state.callRequests.filter(r => r.id !== action.payload);
    },
    setBoostInfo: (state, action) => { state.boostInfo = action.payload; },
    setLoading: (state, action) => { state.loading = action.payload; },
  },
});

export const { setChatRequests, setCallRequests, removeChatRequest, removeCallRequest, setBoostInfo, setLoading } = dashboardSlice.actions;
export default dashboardSlice.reducer;
