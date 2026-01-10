import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProjectCard from "../components/ProjectCard";
import { useAuth } from "../context/AuthContext";
import { apiFetch, resolveMediaUrl } from "../lib/api";
import { fetchSocialConnections, toggleFollow } from "../lib/follow";
import "../styles/ProfilePage.css";
import type { Project, ProjectListResponse } from "../types/project";
import type { User, UserSummary } from "../types/user";

function initialsFromName(source?: string) {
  return (source || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase?.() || "")
    .join("")
    .slice(0, 2);
}

type UserResponse = {
  user: User;
};

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user: currentUser, updateUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [followers, setFollowers] = useState<UserSummary[]>([]);
  const [following, setFollowing] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [pendingFollowIds, setPendingFollowIds] = useState<string[]>([]);
  const [togglingFollow, setTogglingFollow] = useState(false);

  const currentUserId = currentUser?.id;
  const viewedUserId = profile?.id;
  const isSelf = Boolean(currentUserId && viewedUserId && currentUserId === viewedUserId);

  const isPending = useCallback(
    (value?: string) => (value ? pendingFollowIds.includes(value) : false),
    [pendingFollowIds]
  );

  const loadSocialLists = useCallback(
    async (userId: string, authToken: string) => {
      setLoadingSocial(true);
      try {
        return await fetchSocialConnections(userId, authToken);
      } catch (err) {
        console.warn("Unable to load social lists", err);
        return { followers: [], following: [] };
      } finally {
        setLoadingSocial(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!id) {
      setError("User not found");
      setLoading(false);
      return;
    }
    if (!token) {
      setError("Sign in to view profiles.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const authToken = token as string;
        const [profilePayload, projectsPayload] = await Promise.all([
          apiFetch<UserResponse>(`/api/users/${id}`, { token: authToken }),
          apiFetch<ProjectListResponse>(`/api/projects?owner=${id}`, { token: authToken }),
        ]);

        if (cancelled) {
          return;
        }

        const nextProfile = profilePayload?.user ?? null;
        setProfile(nextProfile);
        setProjects(projectsPayload?.projects ?? []);
        setError(null);

        if (nextProfile?.id) {
          const social = await loadSocialLists(nextProfile.id, authToken);
          if (cancelled) {
            return;
          }
          setFollowers(social.followers);
          setFollowing(social.following);
        } else {
          setFollowers([]);
          setFollowing([]);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : "Unable to load profile");
        setProfile(null);
        setProjects([]);
        setFollowers([]);
        setFollowing([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id, loadSocialLists, token]);

  useEffect(() => {
    if (isSelf) {
      navigate("/profile", { replace: true });
    }
  }, [isSelf, navigate]);

  const followerCount =
    typeof profile?.followersCount === "number"
      ? profile.followersCount
      : Array.isArray(profile?.followers)
        ? profile.followers.length
        : 0;

  const followingCount =
    typeof profile?.followingCount === "number"
      ? profile.followingCount
      : Array.isArray(profile?.following)
        ? profile.following.length
        : 0;

  const savedCount = Array.isArray(profile?.savedProjects) ? profile.savedProjects.length : 0;
  const projectCount = projects.length || (Array.isArray(profile?.projects) ? profile.projects.length : 0);

  const joinedLabel = useMemo(() => {
    if (!profile?.createdAt) {
      return "Joined recently";
    }
    try {
      return `Joined ${new Date(profile.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
      })}`;
    } catch (err) {
      return "Joined recently";
    }
  }, [profile?.createdAt]);

  const lastActive = profile?.lastLogin || profile?.updatedAt;

  const lastActiveLabel = useMemo(() => {
    if (!lastActive) {
      return "Active now";
    }
    try {
      const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
      const now = Date.now();
      const parsed = new Date(lastActive).getTime();
      const diff = parsed - now;
      const minutes = Math.round(diff / (1000 * 60));
      if (Math.abs(minutes) < 60) {
        return `Active ${formatter.format(minutes, "minute")}`;
      }
      const hours = Math.round(minutes / 60);
      if (Math.abs(hours) < 48) {
        return `Active ${formatter.format(hours, "hour")}`;
      }
      const days = Math.round(hours / 24);
      return `Active ${formatter.format(days, "day")}`;
    } catch (err) {
      return "Active recently";
    }
  }, [lastActive]);

  const handleFollowToggle = async () => {
    if (!token || !viewedUserId || viewedUserId === currentUserId || togglingFollow) {
      return;
    }

    try {
      setTogglingFollow(true);
      const response = await toggleFollow(viewedUserId, Boolean(profile?.isFollowing), token);
      setProfile(response.target);
      updateUser(() => response.user ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update follow state");
    } finally {
      setTogglingFollow(false);
    }
  };

  const handleFollowToggleForUser = useCallback(
    async (person: UserSummary) => {
      const targetId = person.id;
      if (!token || !targetId || targetId === currentUserId || isPending(targetId)) {
        return;
      }
      setPendingFollowIds((prev) => (prev.includes(targetId) ? prev : [...prev, targetId]));

      try {
        const response = await toggleFollow(targetId, Boolean(person.isFollowing), token);
        updateUser(() => response.user ?? null);
        setProfile((prev) => (prev && prev.id === response.target.id ? response.target : prev));

        if (viewedUserId) {
          const social = await loadSocialLists(viewedUserId, token);
          setFollowers(social.followers);
          setFollowing(social.following);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to update follow state");
      } finally {
        setPendingFollowIds((prev) => prev.filter((value) => value !== targetId));
      }
    },
    [currentUserId, isPending, loadSocialLists, token, updateUser, viewedUserId]
  );

  let pageContent: React.ReactNode;

  if (loading) {
    pageContent = <div className="profile-state">Loading profile…</div>;
  } else if (error) {
    pageContent = <div className="page-alert error">{error}</div>;
  } else if (!profile) {
    pageContent = <div className="profile-state">Profile not available.</div>;
  } else {
    const avatarUrl = resolveMediaUrl(profile.avatar);
    const displayName = profile.name?.trim() || profile.username || "Builder";
    const username = profile.username || "username";
    const bio = profile.bio?.trim();
    const location = profile.location?.trim();
    const experienceLevel = profile.experienceLevel?.trim();
    const skillList = Array.isArray(profile.skills) ? profile.skills.filter(Boolean).slice(0, 12) : [];
    const savedCount = Array.isArray(profile.savedProjects) ? profile.savedProjects.length : 0;
    const projectCount = projects.length || (Array.isArray(profile.projects) ? profile.projects.length : 0);
    const followerCount =
      typeof profile.followersCount === "number"
        ? profile.followersCount
        : Array.isArray(profile.followers)
          ? profile.followers.length
          : 0;
    const followingCount =
      typeof profile.followingCount === "number"
        ? profile.followingCount
        : Array.isArray(profile.following)
          ? profile.following.length
          : 0;

    pageContent = (
      <>
        <header className="page-header">
          <p className="page-kicker">Profile</p>
          <h1>{displayName}</h1>
          <p className="page-subtitle">Track builds and follow their drops.</p>
        </header>

        <section className="profile-page">
          <article className="page-card profile-card">
            <div className="profile-card__avatar" aria-hidden={!avatarUrl}>
              {avatarUrl ? <img src={avatarUrl} alt={`${displayName} avatar`} loading="lazy" /> : <span>{initialsFromName(displayName)}</span>}
            </div>
            <div className="profile-card__body">
              <div className="profile-card__primary">
                <div>
                  <h2>{displayName}</h2>
                  <p className="profile-card__handle">@{username}</p>
                </div>
                {viewedUserId && currentUserId && viewedUserId !== currentUserId ? (
                  <button
                    type="button"
                    className="page-button secondary"
                    onClick={handleFollowToggle}
                    disabled={togglingFollow}
                  >
                    {profile.isFollowing ? (togglingFollow ? "Updating…" : "Unfollow") : togglingFollow ? "Updating…" : "Follow"}
                  </button>
                ) : null}
              </div>
              <div className="profile-card__meta">
                {location ? <span>{location}</span> : null}
                {experienceLevel ? <span>{experienceLevel}</span> : null}
                <span>{joinedLabel}</span>
                <span>{lastActiveLabel}</span>
              </div>
              {bio ? <p className="profile-card__bio">{bio}</p> : null}
              <dl className="profile-card__stats">
                <div>
                  <dt>Projects</dt>
                  <dd>{projectCount}</dd>
                </div>
                <div>
                  <dt>Saved</dt>
                  <dd>{savedCount}</dd>
                </div>
                <div>
                  <dt>Followers</dt>
                  <dd>{followerCount}</dd>
                </div>
                <div>
                  <dt>Following</dt>
                  <dd>{followingCount}</dd>
                </div>
              </dl>
            </div>
          </article>

          <article className="page-card profile-details">
            <section>
              <h3>Contact</h3>
              <ul className="profile-links">
                {profile.email ? (
                  <li>
                    <span>Email</span>
                    <a href={`mailto:${profile.email}`}>{profile.email}</a>
                  </li>
                ) : null}
                {profile.github ? (
                  <li>
                    <span>GitHub</span>
                    <a href={profile.github} target="_blank" rel="noreferrer">
                      {profile.github}
                    </a>
                  </li>
                ) : null}
                {profile.linkedin ? (
                  <li>
                    <span>LinkedIn</span>
                    <a href={profile.linkedin} target="_blank" rel="noreferrer">
                      {profile.linkedin}
                    </a>
                  </li>
                ) : null}
                {profile.portfolio ? (
                  <li>
                    <span>Portfolio</span>
                    <a href={profile.portfolio} target="_blank" rel="noreferrer">
                      {profile.portfolio}
                    </a>
                  </li>
                ) : null}
              </ul>
            </section>

            <section>
              <h3>Skills</h3>
              {skillList.length ? (
                <ul className="profile-skills">
                  {skillList.map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
              ) : (
                <p className="profile-empty">No skills listed yet.</p>
              )}
            </section>

            <section>
              <h3>Followers</h3>
              {loadingSocial ? (
                <p className="profile-empty">Loading followers…</p>
              ) : followers.length ? (
                <ul className="profile-follow-list" aria-label="Followers">
                  {followers.slice(0, 10).map((person, index) => {
                    const personId = person.id ?? person.username ?? `follower-${index}`;
                    const avatar = resolveMediaUrl(person.avatar);
                    const heading = person.name || person.username || "Builder";
                    const pending = isPending(person.id);
                    const isSelfFollower = currentUserId && person.id === currentUserId;

                    return (
                      <li key={personId} className="profile-follow-list__item">
                        <div className="profile-follow-list__avatar" aria-hidden>
                          {avatar ? <img src={avatar} alt="" loading="lazy" /> : <span>{initialsFromName(heading)}</span>}
                        </div>
                        <div className="profile-follow-list__body">
                          <strong>{heading}</strong>
                          <span>@{person.username || "unknown"}</span>
                          {person.bio ? <p>{person.bio}</p> : null}
                        </div>
                        {person.id && currentUserId && !isSelfFollower ? (
                          <button
                            type="button"
                            className="profile-follow-list__action"
                            onClick={() => handleFollowToggleForUser(person)}
                            disabled={pending}
                          >
                            {person.isFollowing ? (pending ? "Updating…" : "Unfollow") : "Follow back"}
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="profile-empty">No followers yet.</p>
              )}
            </section>

            <section>
              <h3>Following</h3>
              {loadingSocial ? (
                <p className="profile-empty">Loading following…</p>
              ) : following.length ? (
                <ul className="profile-follow-list" aria-label="Following">
                  {following.slice(0, 10).map((person, index) => {
                    const personId = person.id ?? person.username ?? `following-${index}`;
                    const avatar = resolveMediaUrl(person.avatar);
                    const heading = person.name || person.username || "Builder";
                    const pending = isPending(person.id);
                    const isSelfFollowing = currentUserId && person.id === currentUserId;

                    return (
                      <li key={personId} className="profile-follow-list__item">
                        <div className="profile-follow-list__avatar" aria-hidden>
                          {avatar ? <img src={avatar} alt="" loading="lazy" /> : <span>{initialsFromName(heading)}</span>}
                        </div>
                        <div className="profile-follow-list__body">
                          <strong>{heading}</strong>
                          <span>@{person.username || "unknown"}</span>
                          {person.bio ? <p>{person.bio}</p> : null}
                        </div>
                        {person.id && currentUserId && !isSelfFollowing ? (
                          <button
                            type="button"
                            className="profile-follow-list__action"
                            onClick={() => handleFollowToggleForUser(person)}
                            disabled={pending}
                          >
                            {person.isFollowing ? (pending ? "Updating…" : "Unfollow") : "Follow"}
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="profile-empty">Not following anyone yet.</p>
              )}
            </section>
          </article>

          <article className="page-card profile-projects">
            <div className="profile-projects__header">
              <h3>Projects</h3>
              <p>Public builds from this profile.</p>
            </div>
            {projects.length ? (
              <div className="profile-projects__grid">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="profile-empty">No public projects yet.</div>
            )}
          </article>
        </section>
      </>
    );
  }

  return <main className="page-shell">{pageContent}</main>;
}
