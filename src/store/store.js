import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer      from './slices/authSlice';
import walletReducer    from './slices/walletSlice';
import dashboardReducer from './slices/dashboardSlice';

const persistConfig = {
  key: 'astrologer-root',
  storage: AsyncStorage,
  whitelist: ['auth'], // only persist auth
};

const rootReducer = combineReducers({
  auth:      authReducer,
  wallet:    walletReducer,
  dashboard: dashboardReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
