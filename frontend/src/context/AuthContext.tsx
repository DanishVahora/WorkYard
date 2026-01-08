import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type AuthUser = Record<string, unknown> & {
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  avatar?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (payload: { user: AuthUser; token: string }) => void;
  logout: () => void;
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
    return JSON.parse(raw) as { user: AuthUser; token: string };
  } catch (err) {
    console.warn("Unable to parse auth payload", err);
    return null;
  }
}

function writePersistedAuth(payload: { user: AuthUser; token: string } | null) {
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
  const [user, setUser] = useState<AuthUser | null>(null);
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

  const login = useCallback(({ user: nextUser, token: nextToken }: { user: AuthUser; token: string }) => {
    setUser(nextUser);
    setToken(nextToken);
    writePersistedAuth({ user: nextUser, token: nextToken });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    writePersistedAuth(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [user, token, loading, login, logout]
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
