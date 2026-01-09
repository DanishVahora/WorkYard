import { apiFetch } from "./api";
import type { User, UserSummary } from "../types/user";

export type FollowResponse = {
  message: string;
  user: User;
  target: User;
};

export async function toggleFollow(userId: string, isFollowing: boolean, token: string) {
  const method = isFollowing ? "DELETE" : "POST";
  return apiFetch<FollowResponse>(`/api/users/${userId}/follow`, { method, token });
}

export async function fetchSocialConnections(userId: string, token: string) {
  const [followersPayload, followingPayload] = await Promise.all([
    apiFetch<{ followers: UserSummary[] }>(`/api/users/${userId}/followers`, { token }),
    apiFetch<{ following: UserSummary[] }>(`/api/users/${userId}/following`, { token }),
  ]);

  return {
    followers: followersPayload.followers ?? [],
    following: followingPayload.following ?? [],
  };
}
