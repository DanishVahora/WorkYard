import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  fetchConversations,
  fetchConversationMessages,
  getApiBase,
  markConversationRead,
  resolveMediaUrl,
  searchUsers,
  sendChatMessage,
  startConversation,
  sendChatAttachment,
  reactToMessage,
} from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Conversation, ChatMessage, ChatUser, ChatReaction } from "../types/message";
import type { UserSummary } from "../types/user";
import "../styles/MessagePage.css";

const SOCKET_EVENTS = {
  newMessage: "messages:new",
  conversationUpdated: "conversations:updated",
  messageRead: "messages:read",
  messageReacted: "messages:reacted",
};

const REACTION_OPTIONS: Array<{ key: ChatReaction["type"]; label: string }> = [
  { key: "like", label: "👍" },
  { key: "love", label: "❤️" },
  { key: "laugh", label: "😂" },
  { key: "wow", label: "😮" },
  { key: "sad", label: "😢" },
  { key: "angry", label: "😡" },
];

function formatTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMinutes = (Date.now() - date.getTime()) / (1000 * 60);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${Math.floor(diffMinutes)}m ago`;

  const diffHours = diffMinutes / 60;
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getPeer(conversation: Conversation | undefined, currentUserId?: string | null): ChatUser | null {
  if (!conversation || !conversation.participants?.length || !currentUserId) return conversation?.participants?.[0] ?? null;
  return (
    conversation.participants.find((p) => p.id && p.id !== currentUserId) || conversation.participants[0] || null
  );
}

export default function MessagesPage() {
  const { token, user } = useAuth();
  const currentUserId = user?.id;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState<boolean>(false);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [messageBody, setMessageBody] = useState<string>("");
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchResults, setSearchResults] = useState<UserSummary[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null);
  const [showComposerEmoji, setShowComposerEmoji] = useState<boolean>(false);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const apiBase = useMemo(() => {
    const base = getApiBase().replace(/\/$/, "");
    if (base) return base;
    if (typeof window !== "undefined" && window.location) return window.location.origin;
    return "";
  }, []);

  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, []);

  const upsertConversation = useCallback((entry: Conversation) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== entry.id);
      const next = [entry, ...filtered];
      next.sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      });
      return next;
    });
  }, []);

  const handleIncomingMessage = useCallback(
    (incoming: ChatMessage) => {
      if (!incoming?.conversationId) return;
      const normalized: ChatMessage = {
        ...incoming,
        isMine: incoming.senderId === currentUserId,
      };

      setMessages((prev) => {
        if (normalized.conversationId !== selectedId) return prev;
        const exists = prev.some((msg) => msg.id === normalized.id);
        if (exists) return prev.map((msg) => (msg.id === normalized.id ? normalized : msg));
        return [...prev, normalized];
      });

      setConversations((prev) => {
        const existing = prev.find((c) => c.id === normalized.conversationId);
        const unreadIncrement = normalized.isMine ? 0 : 1;
        if (!existing) {
          const next = [
            {
              id: normalized.conversationId,
              participants: [],
              lastMessage: normalized,
              lastMessageAt: normalized.createdAt,
              unreadCount: unreadIncrement,
            },
            ...prev,
          ];
          next.sort((a, b) => {
            const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
            const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
            return bTime - aTime;
          });
          return next;
        }

        const updated: Conversation = {
          ...existing,
          lastMessage: normalized,
          lastMessageAt: normalized.createdAt,
          unreadCount: (existing.unreadCount || 0) + unreadIncrement,
        };
        const next = [updated, ...prev.filter((c) => c.id !== updated.id)];
        next.sort((a, b) => {
          const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return bTime - aTime;
        });
        return next;
      });

      if (normalized.conversationId === selectedId && !normalized.isMine && token) {
        markConversationRead(normalized.conversationId, token).catch(() => undefined);
      }

      if (normalized.conversationId === selectedId) {
        setTimeout(scrollToBottom, 80);
      }
    },
    [currentUserId, scrollToBottom, selectedId, token]
  );

  const handleConversationUpdate = useCallback(
    (payload: Conversation) => {
      if (!payload?.id) return;
      upsertConversation(payload);
    },
    [upsertConversation]
  );

  const handleReadReceipt = useCallback(
    (payload: { conversationId: string; readerId: string }) => {
      if (!payload?.conversationId) return;

      setMessages((prev) => {
        if (payload.conversationId !== selectedId) return prev;
        return prev.map((msg) => {
          if (msg.senderId === payload.readerId) return msg;
          if (msg.readAt) return msg;
          return { ...msg, readAt: new Date().toISOString() };
        });
      });

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === payload.conversationId ? { ...conv, unreadCount: 0 } : conv
        )
      );
    },
    [selectedId]
  );

  const handleReaction = useCallback((msg: ChatMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)));
  }, []);

  useEffect(() => {
    const socket = io(apiBase || undefined, {
      transports: ["websocket"],
      auth: { token },
    });

    socketRef.current = socket;

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on(SOCKET_EVENTS.newMessage, handleIncomingMessage);
    socket.on(SOCKET_EVENTS.conversationUpdated, handleConversationUpdate);
    socket.on(SOCKET_EVENTS.messageRead, handleReadReceipt);
    socket.on(SOCKET_EVENTS.messageReacted, handleReaction);
    socket.on("connect_error", (err) => {
      console.warn("Message socket error", err?.message || err);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [apiBase, handleConversationUpdate, handleIncomingMessage, handleReadReceipt, handleReaction, token]);

  useEffect(() => {
    let cancelled = false;
    if (!token) return undefined;

    const authToken = token;

    async function loadConversations() {
      try {
        setLoadingConversations(true);
        const response = await fetchConversations(authToken);
        if (cancelled) return;
        setConversations(response.conversations || []);
        if (!selectedId && response.conversations?.length) {
          setSelectedId(response.conversations[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load conversations");
        }
      } finally {
        if (!cancelled) setLoadingConversations(false);
      }
    }

    loadConversations();
    return () => {
      cancelled = true;
    };
  }, [selectedId, token]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedId || !token) {
      setMessages([]);
      return undefined;
    }

    const conversationId = selectedId;
    const authToken = token;

    async function loadMessages() {
      try {
        setLoadingMessages(true);
        const response = await fetchConversationMessages(conversationId, authToken, 80);
        if (cancelled) return;
        const payload = (response.messages || []).map((msg) => ({
          ...msg,
          isMine: msg.senderId === currentUserId,
        }));
        setMessages(payload);
        if (payload.length) {
          setTimeout(scrollToBottom, 80);
          const hasUnreadFromOther = payload.some((msg) => !msg.isMine && !msg.readAt);
          if (hasUnreadFromOther) {
            markConversationRead(conversationId, authToken).catch(() => undefined);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load messages");
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    }

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, scrollToBottom, selectedId, token]);

  useEffect(() => {
    if (!token) return undefined;
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSearchResults([]);
      return undefined;
    }

    const authToken = token;

    let cancelled = false;
    const handle = window.setTimeout(async () => {
      try {
        setSearching(true);
        const response = await searchUsers(searchTerm.trim(), authToken);
        if (!cancelled) {
          setSearchResults(response.users || []);
        }
      } catch (err) {
        if (!cancelled) console.warn("Search failed", err);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [searchTerm, token]);

  useEffect(() => {
    if (!selectedId) return;
    scrollToBottom();
  }, [messages.length, scrollToBottom, selectedId]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === selectedId) || null,
    [conversations, selectedId]
  );

  const activePeer = useMemo(() => getPeer(activeConversation || undefined, currentUserId), [activeConversation, currentUserId]);

  const handleSend = useCallback(
    async (evt?: React.FormEvent) => {
      evt?.preventDefault();
      if (!selectedId || !token) return;
      const trimmed = messageBody.trim();
      const hasFiles = files && files.length > 0;
      if (!trimmed && !hasFiles) return;

      const optimistic: ChatMessage = {
        id: `local-${Date.now()}`,
        conversationId: selectedId,
        senderId: currentUserId || "",
        recipientId: activePeer?.id || "",
        body: trimmed,
        createdAt: new Date().toISOString(),
        isMine: true,
        attachments: hasFiles
          ? [
              {
                url: "",
                name: files?.[0]?.name,
                mime: files?.[0]?.type,
                size: files?.[0]?.size,
              },
            ]
          : [],
      };

      setMessageBody("");
      setFiles(null);
      setMessages((prev) => [...prev, optimistic]);
      setTimeout(scrollToBottom, 40);

      try {
        const sender = hasFiles
          ? await sendChatAttachment(selectedId, files as FileList, trimmed, token)
          : await sendChatMessage(selectedId, trimmed, token);

        setMessages((prev) => {
          const withoutOptimistic = prev.filter((msg) => !msg.id.startsWith("local-"));
          const finalMessage: ChatMessage = {
            ...sender.message,
            isMine: true,
          };
          return [...withoutOptimistic, finalMessage];
        });
        if (sender.conversation) {
          upsertConversation(sender.conversation);
        }
        setTimeout(scrollToBottom, 60);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to send message");
        setMessages((prev) => prev.filter((msg) => !msg.id.startsWith("local-")));
      }
    },
    [activePeer?.id, currentUserId, files, messageBody, scrollToBottom, selectedId, token, upsertConversation]
  );

  const startChatWithUser = useCallback(
    async (userId: string) => {
      if (!token) return;
      try {
        const response = await startConversation(userId, token);
        if (response.conversation) {
          upsertConversation(response.conversation);
          setSelectedId(response.conversation.id);
          setSearchTerm("");
          setSearchResults([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to start conversation");
      }
    },
    [token, upsertConversation]
  );

  const addEmojiToComposer = useCallback(
    (emoji: string) => {
      setMessageBody((prev) => `${prev}${emoji}`);
      setShowComposerEmoji(false);
    },
    []
  );

  const renderMessage = (msg: ChatMessage) => {
    const isMine = msg.senderId === currentUserId;
    const hasAttachment = msg.attachments && msg.attachments.length > 0;
    return (
      <div
        key={msg.id}
        className={`chat-bubble ${isMine ? "is-mine" : "is-theirs"}`}
        onMouseLeave={() => setShowReactionsFor((prev) => (prev === msg.id ? null : prev))}
      >
        {hasAttachment && (
          <div className="chat-bubble__attachments">
            {msg.attachments?.map((file, index) => (
              <a
                key={`${msg.id}-file-${index}`}
                href={resolveMediaUrl(file.url)}
                target="_blank"
                rel="noreferrer"
                className="chat-attachment"
              >
                <span className="chat-attachment__icon">📎</span>
                <span className="chat-attachment__name">{file.name || "Attachment"}</span>
              </a>
            ))}
          </div>
        )}
        {msg.body && <p className="chat-bubble__text">{msg.body}</p>}
        <div className="chat-bubble__meta">
          <div className="chat-bubble__meta-left">
            <span className="chat-time">{formatTime(msg.createdAt)}</span>
            {msg.reactionCounts && Object.keys(msg.reactionCounts).length > 0 && (
              <span className="chat-reactions">
                {Object.entries(msg.reactionCounts).map(([key, count]) => (
                  <span key={key} className="chat-reaction-pill">
                    {key === "like" && "👍"}
                    {key === "love" && "❤️"}
                    {key === "laugh" && "😂"}
                    {key === "wow" && "😮"}
                    {key === "sad" && "😢"}
                    {key === "angry" && "😡"}
                    {key === "emoji" && "😊"}
                    <span className="chat-reaction-count">{count}</span>
                  </span>
                ))}
              </span>
            )}
          </div>
          <div className="chat-bubble__meta-right">
            <div className="chat-hover-actions">
              {isMine && msg.readAt && (
                <span className="chat-seen" title="Seen">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </span>
              )}
              <button
                type="button"
                className="chat-reaction-button"
                onClick={() => setShowReactionsFor((prev) => (prev === msg.id ? null : msg.id))}
                aria-label="Add reaction"
              >
                😀
              </button>
            </div>
          </div>
        </div>
        {showReactionsFor === msg.id && (
          <div className="chat-reaction-picker">
            {REACTION_OPTIONS.map((item) => (
              <button
                key={item.key}
                type="button"
                className="chat-reaction-picker__item"
                onClick={async () => {
                  if (!token) return;
                  try {
                    const response = await reactToMessage(msg.conversationId, msg.id, { type: item.key }, token);
                    setShowReactionsFor(null);
                    handleReaction(response.message);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Unable to react");
                  }
                }}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              className="chat-reaction-picker__item"
              onClick={async () => {
                const custom = window.prompt("Type an emoji");
                if (!custom || !token) return;
                try {
                  const response = await reactToMessage(msg.conversationId, msg.id, { type: "emoji", emoji: custom }, token);
                  setShowReactionsFor(null);
                  handleReaction(response.message);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Unable to react");
                }
              }}
            >
              ✨
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="messages-shell only-messages">
      <section className="messages-layout">
        <aside className="messages-sidebar">
          <div className="messages-sidebar__header">
            <div>
              <p className="sidebar-title">Inbox</p>
              <p className="sidebar-subtitle">{socketConnected ? "Live" : "Connecting..."}</p>
            </div>
            <span className={`status-dot ${socketConnected ? "online" : "offline"}`} aria-label={socketConnected ? "Connected" : "Disconnected"} />
          </div>

          <div className="messages-search">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search followers"
            />
          </div>

          {searchTerm && searchResults.length > 0 && (
            <div className="messages-search-results">
              {searchResults.map((candidate) => (
                <button
                  key={candidate.id}
                  className="search-result"
                  type="button"
                  onClick={() => candidate.id && startChatWithUser(candidate.id)}
                  disabled={!candidate.isFollowing}
                >
                  <img
                    src={resolveMediaUrl(candidate.avatar) || "/placeholder-avatar.svg"}
                    alt={candidate.name || candidate.username || "User"}
                  />
                  <div>
                    <p className="search-result__name">{candidate.name || candidate.username}</p>
                    <p className="search-result__meta">
                      {candidate.username ? `@${candidate.username}` : ""}
                      {!candidate.isFollowing && <span className="search-result__restricted">Follow required</span>}
                    </p>
                  </div>
                </button>
              ))}
              {searching && <p className="search-hint">Searching...</p>}
            </div>
          )}

          <div className="conversation-list">
            {loadingConversations && <p className="search-hint">Loading conversations...</p>}
            {!loadingConversations && conversations.length === 0 && (
              <p className="search-hint">No conversations yet. Start one with a follower.</p>
            )}

            {conversations.map((conversation) => {
              const peer = getPeer(conversation, currentUserId);
              const isActive = selectedId === conversation.id;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  className={`conversation-card ${isActive ? "is-active" : ""}`}
                  onClick={() => setSelectedId(conversation.id)}
                >
                  <img
                    src={resolveMediaUrl(peer?.avatar) || "/placeholder-avatar.svg"}
                    alt={peer?.name || peer?.username || "User"}
                    className="conversation-card__avatar"
                  />
                  <div className="conversation-card__body">
                    <div className="conversation-card__top">
                      <p className="conversation-card__name">{peer?.name || peer?.username || "Unknown"}</p>
                      <span className="conversation-card__time">{formatTime(conversation.lastMessageAt)}</span>
                    </div>
                    <div className="conversation-card__bottom">
                      <p className="conversation-card__preview">
                        {conversation.lastMessage?.body || "Say hello"}
                      </p>
                      {conversation.unreadCount ? (
                        <span className="conversation-card__badge">{conversation.unreadCount}</span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="chat-panel">
          {activeConversation ? (
            <>
              <header className="chat-panel__header">
                <div className="chat-peer">
                  <img
                    src={resolveMediaUrl(activePeer?.avatar) || "/placeholder-avatar.svg"}
                    alt={activePeer?.name || activePeer?.username || "User"}
                  />
                  <div>
                    <p className="chat-peer__name">{activePeer?.name || activePeer?.username}</p>
                    <p className="chat-peer__meta">{activePeer?.role || "Available"}</p>
                  </div>
                </div>
                <div className="chat-status">
                  <span className={`status-dot ${socketConnected ? "online" : "offline"}`} />
                  <p>{socketConnected ? "Connected" : "Offline"}</p>
                </div>
              </header>

              <div className="chat-window" ref={listRef}>
                {loadingMessages && <p className="search-hint">Loading messages...</p>}
                {!loadingMessages && messages.length === 0 && (
                  <p className="chat-placeholder">No messages yet. Start the conversation!</p>
                )}
                {!loadingMessages && messages.map(renderMessage)}
              </div>

              <form className="chat-composer" onSubmit={handleSend}>
                <div className="chat-composer__inputs">
                  <textarea
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="Message..."
                    rows={1}
                  />
                  <div className="chat-composer__actions">
                    <label className="chat-upload">
                      📎
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFiles(e.target.files)}
                        aria-label="Attach image"
                      />
                    </label>
                    <button
                      type="button"
                      className="chat-emoji"
                      onClick={() => setShowComposerEmoji((prev) => !prev)}
                      aria-label="Insert emoji"
                    >
                      😀
                    </button>
                    <button
                      type="submit"
                      className="page-button primary"
                      style={{ padding: "6px 12px", fontSize: "13px" }}
                      disabled={(!messageBody.trim() && !(files && files.length)) || !socketConnected}
                    >
                      Send
                    </button>
                  </div>
                  {files && files.length > 0 && (
                    <p className="chat-upload__meta">{files[0].name}</p>
                  )}
                  {showComposerEmoji && (
                    <div className="chat-emoji-picker">
                      {REACTION_OPTIONS.map((item) => (
                        <button
                          key={`composer-${item.key}`}
                          type="button"
                          className="chat-emoji-picker__item"
                          onClick={() => addEmojiToComposer(item.label)}
                        >
                          {item.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="chat-emoji-picker__item"
                        onClick={() => {
                          const custom = window.prompt("Type an emoji");
                          if (custom) addEmojiToComposer(custom);
                        }}
                      >
                        ✨
                      </button>
                    </div>
                  )}
                </div>
              </form>
            </>
          ) : (
            <div className="chat-empty">
              <p className="chat-empty__title">Select a conversation</p>
              <p className="chat-empty__hint">Choose someone from the left or search followers to start chatting.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}