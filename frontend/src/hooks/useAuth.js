import { useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setToken, setUser, setResolved, patchUser, clearAuth } from "../slices/authSlice";
import { authAPI, profileAPI } from "../services/api";
import { disconnectSocket } from "../services/socket";
import toast from "react-hot-toast";

export default function useAuth() {
  const dispatch = useDispatch();
  const { user, token, resolved } = useSelector((state) => state.auth);

  const persistAuth = useCallback((nextToken, nextUser) => {
    localStorage.setItem("token", nextToken);
    localStorage.setItem("user", JSON.stringify(nextUser));
    dispatch(setToken(nextToken));
    dispatch(setUser(nextUser));
    dispatch(setResolved(true));
  }, [dispatch]);

  const login = useCallback(async (email, password) => {
    disconnectSocket();
    const res = await authAPI.login({ email, password });
    persistAuth(res.token, res.user);
    return res;
  }, [persistAuth]);

  const signup = useCallback(async (payload) => {
    const res = await authAPI.signup(payload);
    if (res?.token && res?.user) {
      persistAuth(res.token, res.user);
    }
    return res;
  }, [persistAuth]);

  const sendOtp = useCallback(async (email) => {
    const res = await authAPI.sendOtp({ email });
    return res;
  }, []);

  const updateUser = useCallback((updates) => {
    let persistedUser = null;

    try {
      persistedUser = JSON.parse(localStorage.getItem("user"));
    } catch {
      persistedUser = null;
    }

    const baseUser = persistedUser || {};
    const nextUser = { ...baseUser, ...updates };
    localStorage.setItem("user", JSON.stringify(nextUser));
    dispatch(patchUser(updates));
  }, [dispatch]);

  const logout = useCallback(({ silent = false } = {}) => {
    disconnectSocket();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    dispatch(clearAuth());
    if (!silent) {
      toast.success("Logged out successfully");
    }
  }, [dispatch]);

  const refreshUser = useCallback(async () => {
    dispatch(setResolved(false));
    try {
      const res = await profileAPI.getUserDetails();
      const nextUser = res.userDetails || res.user || null;
      if (nextUser) {
        localStorage.setItem("user", JSON.stringify(nextUser));
        dispatch(setUser(nextUser));
      }
      dispatch(setResolved(true));
      return nextUser;
    } catch (error) {
      if (error?.status === 401) {
        disconnectSocket();
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        dispatch(clearAuth());
        return null;
      }
      dispatch(setResolved(true));
      throw error;
    }
  }, [dispatch]);

  return { user, token, resolved, login, signup, sendOtp, updateUser, refreshUser, logout };
}
