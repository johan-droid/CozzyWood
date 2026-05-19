/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);
const TOKEN_STORAGE_KEY = "cozzywood_access_token";

function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || "";
}

function setStoredToken(token) {
  if (!token) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(getStoredToken);
  const [isBooting, setIsBooting] = useState(true);

  const authHeader = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    [accessToken]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore logout network failure and clear local state
    } finally {
      setAccessToken("");
      setStoredToken("");
      setUser(null);
    }
  }, []);

  const fetchMe = useCallback(
    async (tokenOverride) => {
      const token = tokenOverride ?? accessToken;
      if (!token) {
        setUser(null);
        return null;
      }

      const response = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data.user);
      return response.data.user;
    },
    [accessToken]
  );

  const refreshAccessToken = useCallback(async () => {
    const response = await api.post("/auth/refresh");
    const nextToken = response.data.accessToken;
    setAccessToken(nextToken);
    setStoredToken(nextToken);
    return nextToken;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const response = await api.post("/auth/login", { email, password });
    setAccessToken(response.data.accessToken);
    setStoredToken(response.data.accessToken);
    setUser(response.data.user);
    return response.data.user;
  }, []);

  const register = useCallback(async ({ name, email, password }) => {
    const response = await api.post("/auth/register", { name, email, password });
    setAccessToken(response.data.accessToken);
    setStoredToken(response.data.accessToken);
    setUser(response.data.user);
    return response.data.user;
  }, []);

  useEffect(() => {
    async function bootstrapAuth() {
      try {
        if (accessToken) {
          await fetchMe(accessToken);
        } else {
          const nextToken = await refreshAccessToken();
          await fetchMe(nextToken);
        }
      } catch {
        try {
          const nextToken = await refreshAccessToken();
          await fetchMe(nextToken);
        } catch {
          setAccessToken("");
          setStoredToken("");
          setUser(null);
        }
      } finally {
        setIsBooting(false);
      }
    }
    bootstrapAuth();
  }, [accessToken, fetchMe, refreshAccessToken]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      authHeader,
      isAuthenticated: Boolean(user),
      isBooting,
      login,
      register,
      logout,
      refreshAccessToken,
      fetchMe,
    }),
    [accessToken, authHeader, fetchMe, isBooting, login, logout, refreshAccessToken, register, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
