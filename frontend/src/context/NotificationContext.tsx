import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import {
  fetchNotifications,
  getApiBase,
  markAllNotificationsRead,
  markNotificationRead,
} from "../lib/api";
import type { NotificationItem } from "../types/notification";

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export type NotificationContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  latest: NotificationItem | null;
  loading: boolean;
  connected: boolean;
  markAsRead: (id: string) => Promise<NotificationItem | null>;
  markAllAsRead: () => Promise<void>;
  dismissLatest: () => void;
};

const SOCKET_EVENT = "notifications:new";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [latest, setLatest] = useState<NotificationItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const apiBase = useMemo(() => {
    const base = getApiBase().replace(/\/$/, "");
    if (base) {
      return base;
    }
    if (typeof window !== "undefined" && window.location) {
      return window.location.origin;
    }
    return "";
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadExisting(authToken: string) {
      try {
        setLoading(true);
        const response = await fetchNotifications(authToken, 40);
        if (cancelled) return;
        setNotifications(response.notifications ?? []);
      } catch (err) {
        if (!cancelled) {
          console.warn("Unable to load notifications", err);
          setNotifications([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (!token || !isAuthenticated) {
      setNotifications([]);
      setLatest(null);
      setConnected(false);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return () => {
        cancelled = true;
      };
    }

    loadExisting(token);

    const socket = io(apiBase || undefined, {
      transports: ["websocket"],
      auth: { token },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      if (!cancelled) {
        setConnected(true);
      }
    });

    socket.on("disconnect", () => {
      if (!cancelled) {
        setConnected(false);
      }
    });

    socket.on(SOCKET_EVENT, (payload: NotificationItem) => {
      setNotifications((prev) => [payload, ...prev.filter((item) => item.id !== payload.id)].slice(0, 100));
      setLatest(payload);
    });

    socket.on("connect_error", (error) => {
      console.warn("Notification socket error", error.message || error);
    });

    return () => {
      cancelled = true;
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [apiBase, isAuthenticated, token]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!token || !id) {
        return null;
      }
      try {
        const response = await markNotificationRead(id, token);
        setNotifications((prev) =>
          prev.map((item) => (item.id === id ? response.notification : item))
        );
        return response.notification;
      } catch (err) {
        console.warn("Unable to mark notification read", err);
        return null;
      }
    },
    [token]
  );

  const markAllAsRead = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      await markAllNotificationsRead(token);
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    } catch (err) {
      console.warn("Unable to mark notifications read", err);
    }
  }, [token]);

  const dismissLatest = useCallback(() => {
    setLatest(null);
  }, []);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      latest,
      loading,
      connected,
      markAsRead,
      markAllAsRead,
      dismissLatest,
    }),
    [connected, dismissLatest, latest, loading, markAllAsRead, markAsRead, notifications, unreadCount]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
