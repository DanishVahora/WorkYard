export type User = {
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  avatar?: string;
  role?: string;
  bio?: string;
  skills?: string[];
  experienceLevel?: string;
  location?: string;
  github?: string;
  linkedin?: string;
  portfolio?: string;
  projects?: string[];
  savedProjects?: string[];
  followers?: string[];
  following?: string[];
  followersCount?: number;
  followingCount?: number;
  isVerified?: boolean;
  isActive?: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
  isFollowing?: boolean;
};

export type UserSummary = {
  id?: string;
  name?: string;
  username?: string;
  avatar?: string;
  role?: string;
  bio?: string;
  followersCount?: number;
  isFollowing?: boolean;
};
