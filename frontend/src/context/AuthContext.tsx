import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "../types/user";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (payload: { user: User; token: string }) => void;
  logout: () => void;
  updateUser: (updater: (prev: User | null) => User | null) => void;
};

const STORAGE_KEY = "workyard.auth";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readPersistedAuth() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as { user: User; token: string };
  } catch (err) {
    console.warn("Unable to parse auth payload", err);
    return null;
  }
}

function writePersistedAuth(payload: { user: User; token: string } | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!payload) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = readPersistedAuth();
    if (stored?.token) {
      setUser(stored.user || null);
      setToken(stored.token);
    }
    setLoading(false);
  }, []);

  const login = useCallback(({ user: nextUser, token: nextToken }: { user: User; token: string }) => {
    setUser(nextUser);
    setToken(nextToken);
    writePersistedAuth({ user: nextUser, token: nextToken });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    writePersistedAuth(null);
  }, []);

  const updateUser = useCallback(
    (updater: (prev: User | null) => User | null) => {
      setUser((prev) => {
        const next = updater(prev);
        if (token) {
          writePersistedAuth(next ? { user: next, token } : null);
        }
        return next;
      });
    },
    [token]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token),
      login,
      logout,
      updateUser,
    }),
    [user, token, loading, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
