import type { ProjectComment, ProjectCommentResponse, ProjectLikeResponse } from "../types/project";
import type {
  NotificationItem,
  NotificationListResponse,
  NotificationReadResponse,
} from "../types/notification";
import type { Conversation, ChatMessage } from "../types/message";

const apiBase = import.meta.env.VITE_API_BASE_URL?.toString().replace(/\/$/, "") || "";

type ApiOptions = RequestInit & { token?: string };

export function getApiBase() {
  return apiBase;
}

function buildUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${apiBase}${normalized}`;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  const finalHeaders = new Headers(headers);
  const body = rest.body as BodyInit | null | undefined;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (!finalHeaders.has("Accept")) {
    finalHeaders.set("Accept", "application/json");
  }

  if (body && !isFormData && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }

  if (token) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...rest,
    headers: finalHeaders,
  });

  const text = await response.text();
  const parseJson = () => {
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch (err) {
      throw new Error("Unable to parse response payload");
    }
  };

  if (!response.ok) {
    const parsed = (() => {
      try {
        return text ? JSON.parse(text) : {};
      } catch {
        return {};
      }
    })() as { message?: string };
    const message = parsed?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return parseJson();
}

export function resolveMediaUrl(path?: string | null) {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (!path.startsWith("/")) {
    return `${apiBase}/${path}`;
  }
  return `${apiBase}${path}`;
}

export async function toggleProjectLike(projectId: string, isLiked: boolean, token: string) {
  const method = isLiked ? "DELETE" : "POST";
  return apiFetch<ProjectLikeResponse>(`/api/projects/${projectId}/like`, { method, token });
}

export async function addProjectComment(projectId: string, body: string, token: string) {
  return apiFetch<ProjectCommentResponse>(`/api/projects/${projectId}/comments`, {
    method: "POST",
    token,
    body: JSON.stringify({ body }),
  });
}

export async function fetchProjectComments(projectId: string, token?: string) {
  const options: ApiOptions = token ? { token } : {};
  return apiFetch<{ comments: ProjectComment[]; commentCount: number }>(`/api/projects/${projectId}/comments`, options);
}

export async function fetchNotifications(token: string, limit = 30) {
  const params = new URLSearchParams({ limit: String(limit) });
  return apiFetch<NotificationListResponse>(`/api/notifications?${params.toString()}`, { token });
}

export async function markNotificationRead(id: string, token: string) {
  return apiFetch<NotificationReadResponse>(`/api/notifications/${id}/read`, {
    method: "PATCH",
    token,
  });
}

export async function markAllNotificationsRead(token: string) {
  return apiFetch<{ message: string }>(`/api/notifications/read-all`, {
    method: "POST",
    token,
  });
}

export async function fetchConversations(token: string) {
  return apiFetch<{ conversations: Conversation[] }>(`/api/messages/conversations`, { token });
}

export async function startConversation(userId: string, token: string) {
  return apiFetch<{ conversation: Conversation }>(`/api/messages/conversations`, {
    method: "POST",
    token,
    body: JSON.stringify({ userId }),
  });
}

export async function fetchConversationMessages(conversationId: string, token: string, limit = 60) {
  const params = new URLSearchParams({ limit: String(limit) });
  return apiFetch<{ messages: ChatMessage[] }>(
    `/api/messages/conversations/${conversationId}/messages?${params.toString()}`,
    { token }
  );
}

export async function sendChatMessage(conversationId: string, body: string, token: string) {
  return apiFetch<{ message: ChatMessage; conversation: Conversation }>(
    `/api/messages/conversations/${conversationId}/messages`,
    {
      method: "POST",
      token,
      body: JSON.stringify({ body }),
    }
  );
}

export async function sendChatAttachment(conversationId: string, files: FileList, body: string, token: string) {
  const formData = new FormData();
  if (body?.trim()) formData.append("body", body.trim());
  if (files?.length) {
    formData.append("files", files[0]);
  }

  return apiFetch<{ message: ChatMessage; conversation: Conversation }>(
    `/api/messages/conversations/${conversationId}/messages`,
    {
      method: "POST",
      token,
      body: formData,
    }
  );
}

export async function reactToMessage(
  conversationId: string,
  messageId: string,
  payload: { type: string; emoji?: string },
  token: string
) {
  return apiFetch<{ message: ChatMessage }>(
    `/api/messages/conversations/${conversationId}/messages/${messageId}/react`,
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }
  );
}

export async function markConversationRead(conversationId: string, token: string) {
  return apiFetch<{ message: string; conversation: Conversation }>(
    `/api/messages/conversations/${conversationId}/read`,
    { method: "POST", token }
  );
}

export async function searchUsers(query: string, token: string) {
  const params = new URLSearchParams({ q: query, limit: "8" });
  return apiFetch<{ users: Array<{ id?: string; name?: string; username?: string; avatar?: string; isFollowing?: boolean }> }>(
    `/api/users/search?${params.toString()}`,
    { token }
  );
}
