import type { User } from "./user";

export type ProjectReactions = {
  applause: number;
  curiosity: number;
  interest: number;
};

export type ProjectComment = {
  id: string;
  body: string;
  createdAt: string;
  author: Pick<User, "id" | "name" | "username" | "avatar" | "role"> | null;
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
  objective?: string;
  problemStatement?: string;
  solutionOverview?: string;
  successMetrics?: string;
  keyFeatures: string[];
  collaborators: string[];
  roadmap: Array<{
    title: string;
    description?: string;
    targetDate?: string;
  }>;
  budget?: string;
  callToAction?: string;
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
  isLiked: boolean;
  likesCount: number;
  comments?: ProjectComment[];
  commentCount: number;
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

export type ProjectLikeResponse = {
  message: string;
  project: Project;
};

export type ProjectCommentResponse = {
  message: string;
  project: Project;
};
