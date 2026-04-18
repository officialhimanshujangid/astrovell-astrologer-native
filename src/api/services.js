import API from './apiClient';

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  sendOtp: (data) => API.post('/astro/checkContactNoExistForUser', data),
  login: (data) => API.post('/astro/loginAppAstrologer', data),
  register: (data) => API.post('/astro/astrologer/add', data),
  getMasterData: () => API.post('/astro/getMasterAstrologer'),
};

// ── Profile ───────────────────────────────────────────────────────────────────
export const profileApi = {
  get: (data) => API.post('/astro/getAstrologerById', data),
  update: (data) => API.post('/astro/astrologer/update', data),
  getSkills: () => API.post('/astro/getSkill'),
  getCategories: () => API.post('/astro/getAstrologerCategory'),
  getAvailability: (data) => API.post('/astro/getAstrologerAvailability', data),
  updateAvailability: (data) => API.post('/astro/updateAstrologerAvailability', data),
};

// ── Chat ──────────────────────────────────────────────────────────────────────
export const chatApi = {
  getRequests: (data) => API.post('/customer/chatRequest/get', data),
  acceptRequest: (data) => API.post('/customer/chatRequest/accept', data),
  rejectRequest: (data) => API.post('/customer/chatRequest/reject', data),
  getMessages: (data) => API.post('/customer/chatRequest/getMessages', data),
  sendMessage: (data) => API.post('/customer/chatRequest/sendMessage', data),
  getChatDetail: (data) => API.post('/customer/chatRequest/getChatDetail', data),
  endChat: (data) => API.post('/customer/chatRequest/endChat', data),
  updateStatus: (data) => API.post('/customer/addStatus', data),
  getChatHistory: (data) => API.post('/customer/getChatHistory', data),
  getActiveSession: (data) => API.post('/customer/getActiveSession', data),
};

// ── Call ──────────────────────────────────────────────────────────────────────
export const callApi = {
  getRequests: (data) => API.post('/customer/callRequest/get', data),
  acceptRequest: (data) => API.post('/customer/callRequest/accept', data),
  rejectRequest: (data) => API.post('/customer/callRequest/reject', data),
  endCall: (data) => API.post('/customer/callRequest/end', data),
  updateStatus: (data) => API.post('/customer/addCallStatus', data),
  getCallHistory: (data) => API.post('/customer/getCallHistory', data),
  getCallById: (data) => API.post('/customer/getCallById', data),
  getZegoToken: (data) => API.post('/customer/zegocloud/token', data),
};

// ── Wallet & Withdraw ─────────────────────────────────────────────────────────
export const walletApi = {
  getBalance: () => API.post('/customer/getWalletBalance'),
  getTransactions: (data) => API.post('/customer/getWalletTransactions', data),
  sendWithdrawRequest: (data) => API.post('/astro/withdrawlrequest/add', data),
  getWithdrawRequests: (data) => API.post('/astro/withdrawlrequest/get', data),
  updateWithdrawRequest: (data) => API.post('/astro/withdrawlrequest/update', data),
  getWithdrawMethods: () => API.post('/astro/withdrawlmethod/get'),
};

// ── Followers ─────────────────────────────────────────────────────────────────
export const followerApi = {
  getFollowers: (data) => API.post('/customer/getAstrologerFollower', data),
};

// ── Puja ──────────────────────────────────────────────────────────────────────
export const pujaApi = {
  getList: (data) => API.post('/astro/astrologerPujaList', data),
  add: (data) => API.post('/astro/addAstrologerPuja', data),
  delete: (data) => API.post('/astro/deleteAstrologerPuja', data),
  sendToUser: (data) => API.post('/astro/sendPujatoUser', data),
  getOrders: (data) => API.post('/astro/getAstrologerPujaOrders', data),
  completeOrder: (data) => API.post('/astro/completePujaOrder', data),
};

// ── Blog ──────────────────────────────────────────────────────────────────────
export const blogApi = {
  getAll: () => API.post('/astro/getAppBlog'),
  getById: (data) => API.post('/astro/getBlogById', data),
};

// ── Horoscope ─────────────────────────────────────────────────────────────────
export const horoscopeApi = {
  getSigns: () => API.post('/customer/getHororscopeSign'),
  getDaily: (data) => API.post('/customer/getDailyHoroscope', data),
  getEnabledLanguages: () => API.post('/customer/getEnabledLanguages'),
};

// ── Kundali ───────────────────────────────────────────────────────────────────
export const kundaliApi = {
  add: (data) => API.post('/customer/kundali/add', data),
  matching: (data) => API.post('/customer/KundaliMatching/add', data),
  matchReport: (data) => API.post('/customer/KundaliMatching/report', data),
  getBasicReport: (data) => API.post('/customer/kundali/basic', data),
  geocode: (data) => API.post('/customer/geocode', data),
  getPanchang: (data) => API.post('/customer/get/panchang', data),
};

// ── Profile Boost ─────────────────────────────────────────────────────────────
export const boostApi = {
  getInfo: (data) => API.post('/customer/getProfileboost', data),
  boost: (data) => API.post('/customer/boostProfile', data),
  history: (data) => API.post('/customer/Profileboosthistory', data),
};

// ── Reviews ───────────────────────────────────────────────────────────────────
export const reviewApi = {
  getReviews: (data) => API.post('/astro/getUserReview', data),
  reply: (data) => API.post('/astro/userReview/reply', data),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportApi = {
  getReports: (data) => API.post('/customer/getUserReport', data),
  updateReport: (id, data) => API.post(`/customer/userReport/update/${id}`, data),
  uploadFile: (data) => API.post('/customer/userReport/uploadFile', data),
};

// ── Live ──────────────────────────────────────────────────────────────────────
export const liveApi = {
  goLive: (data) => API.post('/astro/liveAstrologer/add', data),
  endSession: (data) => API.post('/astro/liveAstrologer/endSession', data),
  getSchedules: () => API.get('/astro/scheduleLive/list'),
  addSchedule: (data) => API.post('/astro/addLiveScheduleweb', data),
  deleteSchedule: (data) => API.post('/astro/schedule/delete', data),
};

// ── Stories ───────────────────────────────────────────────────────────────────
export const storyApi = {
  add: (data) => API.post('/astro/addStory', data),
  get: () => API.post('/astro/getStory'),
  delete: (data) => API.post('/astro/deleteStory', data),
};

// ── Pages ─────────────────────────────────────────────────────────────────────
export const pageApi = {
  getPage: (slug) => API.post('/pages/by-slug', { slug }),
  submitContact: (data) => API.post('/pages/contact', data),
  getSystemFlags: () => API.post('/customer/getSystemFlag'),
};

// ── Appointments ──────────────────────────────────────────────────────────────
export const appointmentApi = {
  getScheduleCalls: (data) => API.post('/customer/getScheduleCallRequest', data),
  delete: (id) => API.delete('/customer/appointment/delete', { data: { id } }),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationApi = {
  get: (data) => API.post('/customer/getNotification', data),
};
