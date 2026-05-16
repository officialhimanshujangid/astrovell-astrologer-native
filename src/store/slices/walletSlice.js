import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { walletApi } from '../../api/services';

export const fetchWalletData = createAsyncThunk(
  'wallet/fetchData',
  async (astrologerId, { rejectWithValue }) => {
    try {
      const [balRes, txRes, wdRes] = await Promise.allSettled([
        walletApi.getBalance(),
        walletApi.getTransactions({ startIndex: 0, fetchRecord: 100 }),
        walletApi.getWithdrawRequests({ astrologerId }),
      ]);

      let balance = 0, totalEarning = 0, totalPending = 0, totalWithdrawn = 0;
      let transactions = [], withdrawals = [];

      if (balRes.status === 'fulfilled') {
        const d = balRes.value.data;
        // Handling { recordList: { amount: 4310, ... } }
        const balData = d?.recordList || d?.data || {};
        balance = parseFloat(balData.amount || 0);
      }

      if (txRes.status === 'fulfilled') {
        const d = txRes.value.data;
        // Handling { recordList: [ ... ], totalCount: 58 }
        transactions = Array.isArray(d?.recordList) ? d.recordList : (Array.isArray(d?.data) ? d.data : []);
        
        // Calculate total earning from credits if not provided by other APIs
        totalEarning = transactions.reduce((acc, tx) => acc + (tx.isCredit == 1 ? parseFloat(tx.amount || 0) : 0), 0);
      }

      if (wdRes.status === 'fulfilled') {
        const d = wdRes.value.data;
        const record = d?.recordList || d?.data || {};
        withdrawals = Array.isArray(record) ? record : (record.withdrawl || []);
        
        // If the summary object exists, use it
        if (!Array.isArray(record)) {
          if (record.walletAmount !== undefined) balance = parseFloat(record.walletAmount) || balance;
          if (record.totalEarning !== undefined) totalEarning = parseFloat(record.totalEarning) || totalEarning;
          totalPending = parseFloat(record.totalPending || 0);
          totalWithdrawn = parseFloat(record.withdrawAmount || 0);
        }
      }

      return { balance, totalEarning, totalPending, totalWithdrawn, transactions, withdrawals };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState: {
    balance: 0,
    totalEarning: 0,
    totalPending: 0,
    totalWithdrawn: 0,
    transactions: [],
    withdrawals: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearWallet: (state) => {
      state.balance = 0;
      state.transactions = [];
      state.withdrawals = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWalletData.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchWalletData.fulfilled, (state, action) => {
        state.loading = false;
        Object.assign(state, action.payload);
      })
      .addCase(fetchWalletData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearWallet } = walletSlice.actions;
export default walletSlice.reducer;
