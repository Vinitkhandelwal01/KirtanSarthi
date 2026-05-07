import { createSlice } from "@reduxjs/toolkit";

const persistedToken = localStorage.getItem("token") || null;
const persistedUser = (() => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
})();

const initialState = {
  signupData: null,
  loading: false,
  token: persistedToken,
  user: persistedUser,
  resolved: !persistedToken,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSignupData(state, { payload }) {
      state.signupData = payload;
    },
    setLoading(state, { payload }) {
      state.loading = payload;
    },
    setToken(state, { payload }) {
      state.token = payload;
    },
    setUser(state, { payload }) {
      state.user = payload;
    },
    setResolved(state, { payload }) {
      state.resolved = payload;
    },
    patchUser(state, { payload }) {
      state.user = state.user ? { ...state.user, ...payload } : payload;
    },
    clearAuth(state) {
      state.user = null;
      state.token = null;
      state.resolved = true;
    },
  },
});

export const { setSignupData, setLoading, setToken, setUser, setResolved, patchUser, clearAuth } =
  authSlice.actions;

export default authSlice.reducer;
