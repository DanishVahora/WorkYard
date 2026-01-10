import type { User } from "./user";

export type NotificationType = "follow" | "like";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  createdAt: string;
  read: boolean;
  actor: Pick<User, "id" | "name" | "username" | "avatar" | "role"> | null;
  project?: { id: string; title: string } | null;
};

export type NotificationListResponse = {
  notifications: NotificationItem[];
};

export type NotificationReadResponse = {
  notification: NotificationItem;
};
