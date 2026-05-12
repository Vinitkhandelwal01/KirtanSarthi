import axios from "axios";

const normalizeApiBaseUrl = (rawValue) => {
  const fallback = "/api/v1";
  if (!rawValue) return fallback;

  let value = String(rawValue).trim();

  // Guard against misconfigured env value like:
  // "REACT_APP_BASE_URL=https://example.com/api/v1"
  if (value.startsWith("REACT_APP_BASE_URL=")) {
    value = value.slice("REACT_APP_BASE_URL=".length).trim();
  }  

  if (!value) return fallback;

  // Remove accidental trailing slash for stable URL joining
  return value.replace(/\/+$/, "");
};

export const API_BASE_URL = normalizeApiBaseUrl(process.env.REACT_APP_BASE_URL);
export const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message || err.message || "Request failed";
    return Promise.reject({ message: msg, status: err.response?.status });
  }
);

// ─── Auth ────────────────────────────────
export const authAPI = {
  login: (data) => axiosInstance.post("/auth/login", data),
  signup: (data) => axiosInstance.post("/auth/signup", data),
  sendOtp: (data) => axiosInstance.post("/auth/sendotp", data),
  changePassword: (data) => axiosInstance.post("/auth/changepassword", data),
  resetPasswordToken: (data) => axiosInstance.post("/auth/reset-password-token", data),
  resetPassword: (data) => axiosInstance.post("/auth/reset-password", data),
};

// ─── Profile ─────────────────────────────
export const profileAPI = {
  getUserDetails: () => axiosInstance.get("/profile/getUserDetails"),
  updateProfile: (data) => axiosInstance.put("/profile/updateProfile", data),
  updateLocation: (data) => axiosInstance.post("/profile/update-location", data),
  updateDisplayPicture: (formData) =>
    axiosInstance.put("/profile/updateDisplayPicture", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deleteProfile: () => axiosInstance.delete("/profile/deleteProfile"),
};

// ─── Artist ──────────────────────────────
export const artistAPI = {
  create: (data) => axiosInstance.post("/artist/create", data),
  update: (data) => axiosInstance.put("/artist/update", data),
  getMe: () => axiosInstance.get("/artist/me"),
  getProfile: (artistId) => axiosInstance.get(`/artist/artistProfile/${artistId}`),
  getAll: () => axiosInstance.get("/artist/all"),
  search: (params) => axiosInstance.get("/artist/search", { params }),
  pause: () => axiosInstance.post("/artist/pause-account"),
  resume: () => axiosInstance.post("/artist/resume-account"),
};

// ─── Availability ────────────────────────
export const availabilityAPI = {
  create: (data) => axiosInstance.post("/availability/create", data),
  getByArtist: (artistId) => axiosInstance.get(`/availability/${artistId}`),
  getFreeSlots: (artistId, date) => axiosInstance.get(`/availability/free/${artistId}`, { params: { date } }),
  update: (id, data) => axiosInstance.put(`/availability/update/${id}`, data),
  markBooked: (data) => axiosInstance.post("/availability/markSlotBooked", data),
};

// ─── Booking ─────────────────────────────
export const bookingAPI = {
  create: (data) => axiosInstance.post("/booking/create", data),
  getMyBookings: () => axiosInstance.get("/booking/my"),
  getArtistBookings: () => axiosInstance.get("/booking/artist"),
  respond: (data) => axiosInstance.post("/booking/respond", data),
  counter: (data) => axiosInstance.post("/booking/counter", data),
  complete: (data) => axiosInstance.post("/booking/complete", data),
  cancelUser: (data) => axiosInstance.post("/booking/cancel/user", data),
  cancelArtist: (data) => axiosInstance.post("/booking/cancel/artist", data),
};

// ─── Rating ──────────────────────────────
export const ratingAPI = {
  create: (data) => axiosInstance.post("/rating/create", data),
  getAverage: (artistId) => axiosInstance.get(`/rating/average/${artistId}`),
  getAll: (artistId) => axiosInstance.get("/rating/all", { params: artistId ? { artistId } : {} }),
  getMy: () => axiosInstance.get("/rating/my"),
};

// ─── Events ──────────────────────────────
export const eventAPI = {
  create: (data) => axiosInstance.post("/event/create", data),
  getAll: (params) => axiosInstance.get("/event", { params }),
  getNearby: (params) => axiosInstance.get("/event/nearby", { params }),
  getById: (id) => axiosInstance.get(`/event/${id}`),
  getForManage: (id) => axiosInstance.get(`/event/${id}/manage`),
  getByArtist: (artistId) => axiosInstance.get(`/event/artist/${artistId}`),
  update: (id, data) => axiosInstance.put(`/event/update/${id}`, data),
  delete: (id) => axiosInstance.delete(`/event/delete/${id}`),
};

// ─── Chat ────────────────────────────────
export const chatAPI = {
  createPrivate: (data) => axiosInstance.post("/chat/private", data),
  createGroup: (data) => axiosInstance.post("/chat/group", data),
  getMyChats: (params) => axiosInstance.get("/chat/my", { params }),
  getChatMode: (chatId) => axiosInstance.get(`/chat/${chatId}/mode`),
  getMessages: (chatId, params) => axiosInstance.get(`/chat/${chatId}/messages`, { params }),
  addMember: (data) => axiosInstance.post("/chat/add", data),
  removeMember: (data) => axiosInstance.post("/chat/remove", data),
  upload: (formData) =>
    axiosInstance.post("/chat/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

// ─── Messages ────────────────────────────
export const messageAPI = {
  markRead: (data) => axiosInstance.post("/message/read", data),
  delete: (data) => axiosInstance.post("/message/delete", data),
  getStatus: (userId) => axiosInstance.get(`/message/status/${userId}`),
};

// ─── AI ──────────────────────────────────
export const aiAPI = {
  chat: (data) => axiosInstance.post("/ai/chat", data),
};

// ─── Notifications ───────────────────────
export const notificationAPI = {
  getAll: () => axiosInstance.get("/notifications"),
  markRead: (data) => axiosInstance.post("/notify/read", data),
};

// ─── Dashboard ──────────────────────────
export const dashboardAPI = {
  user: () => axiosInstance.get("/dashboard/user"),
  artist: () => axiosInstance.get("/dashboard/artist"),
  artistPerformance: () => axiosInstance.get("/dashboard/artist/performance"),
  admin: () => axiosInstance.get("/dashboard/admin"),
  adminArtistPerformance: (id) => axiosInstance.get(`/dashboard/admin/artist-performance/${id}`),
};

// ─── Admin ───────────────────────────────
export const adminAPI = {
  getPendingArtists: () => axiosInstance.get("/admin/getartist"),
  reviewArtist: (data) => axiosInstance.put("/admin/reviewartist", data),
  suspendArtist: (data) => axiosInstance.post("/admin/suspend-artist", data),
  reactivateArtist: (data) => axiosInstance.post("/admin/reactivate-artist", data),
  getUsers: () => axiosInstance.get("/admin/users"),
  getUserById: (id) => axiosInstance.get(`/admin/users/${id}`),
  deleteUser: (id) => axiosInstance.delete(`/admin/users/${id}`),
  getArtists: (params) => axiosInstance.get("/admin/artists", { params }),
  getBookings: () => axiosInstance.get("/admin/bookings"),
  getEvents: () => axiosInstance.get("/admin/events"),
  deleteEvent: (id) => axiosInstance.delete(`/admin/events/${id}`),
  getReviews: () => axiosInstance.get("/admin/reviews"),
  deleteReview: (id) => axiosInstance.delete(`/admin/reviews/${id}`),
  getAnalytics: () => axiosInstance.get("/admin/analytics"),
};

// ─── Contact ─────────────────────────────
export const contactAPI = {
  send: (data) => axiosInstance.post("/reach/contact", data),
};
