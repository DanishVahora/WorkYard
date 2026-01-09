import type { User } from "./user";

export type ProjectReactions = {
  applause: number;
  curiosity: number;
  interest: number;
};

export type ProjectVisibility = "public" | "private";
export type ProjectStatus = "draft" | "published" | "archived";

export type Project = {
  id: string;
  title: string;
  summary: string;
  description?: string;
  tags: string[];
  links: string[];
  status: ProjectStatus;
  visibility: ProjectVisibility;
  heroImage?: string;
  gallery: string[];
  reactions: ProjectReactions;
  owner: Pick<User, "id" | "name" | "username" | "avatar" | "role"> & { _id?: string };
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
  isOwner?: boolean;
  isSaved?: boolean;
};

export type ProjectListResponse = {
  projects: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type ProjectDetailResponse = {
  project: Project;
};
