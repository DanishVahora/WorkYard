import React, { useCallback, useEffect, useMemo, useState } from "react";
import ProjectCard from "../components/ProjectCard";
import { useAuth } from "../context/AuthContext";
import { apiFetch, resolveMediaUrl } from "../lib/api";
import { fetchSocialConnections, toggleFollow } from "../lib/follow";
import "../styles/ProfilePage.css";
import type { Project } from "../types/project";
import type { User, UserSummary } from "../types/user";

type ProfileResponse = {
  user: User;
};

type MyProjectsResponse = {
  projects: Project[];
};

function initialsFromName(source?: string) {
  return (source || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase?.() || "")
    .join("")
    .slice(0, 2);
}

export default function ProfilePage() {
  const { user, token, logout, updateUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(user ?? null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followers, setFollowers] = useState<UserSummary[]>([]);
  const [following, setFollowing] = useState<UserSummary[]>([]);
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [pendingFollowIds, setPendingFollowIds] = useState<string[]>([]);

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

  const isPending = useCallback(
    (id?: string) => (id ? pendingFollowIds.includes(id) : false),
    [pendingFollowIds]
  );

  const handleFollowToggleForUser = useCallback(
    async (person: UserSummary) => {
      const targetId = person.id;
      if (!token || !targetId || isPending(targetId)) {
        return;
      }

      const authToken = token;

      setPendingFollowIds((prev) => (prev.includes(targetId) ? prev : [...prev, targetId]));

      try {
        const response = await toggleFollow(targetId, Boolean(person.isFollowing), authToken);

        const nextProfile = response.user ?? null;
        setProfile(nextProfile);
        updateUser(() => nextProfile);
        setError(null);

        if (nextProfile?.id) {
          const social = await loadSocialLists(nextProfile.id, authToken);
          setFollowers(social.followers);
          setFollowing(social.following);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to update follow state");
      } finally {
        setPendingFollowIds((prev) => prev.filter((value) => value !== targetId));
      }
    },
    [isPending, loadSocialLists, token, updateUser]
  );

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setProfile(null);
      setProjects([]);
      setFollowers([]);
      setFollowing([]);
      setError(null);
      return;
    }

    let isMounted = true;
    const authToken = token;

    async function load(currentToken: string) {
      setLoading(true);
      try {
        const [profilePayload, projectsPayload] = await Promise.all([
          apiFetch<ProfileResponse>("/api/auth/me", { token: currentToken }),
          apiFetch<MyProjectsResponse>("/api/projects/mine", { token: currentToken }),
        ]);

        if (!isMounted) {
          return;
        }

        const nextProfile = profilePayload?.user ?? null;
        setProfile(nextProfile);
        updateUser(() => nextProfile);
        setProjects(projectsPayload?.projects ?? []);
        setError(null);

        if (nextProfile?.id) {
          const social = await loadSocialLists(nextProfile.id, currentToken);
          if (!isMounted) {
            return;
          }
          setFollowers(social.followers);
          setFollowing(social.following);
        } else {
          setFollowers([]);
          setFollowing([]);
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }
        const message = err instanceof Error ? err.message : "Unable to load profile";
        setError(message);
        setProfile(null);
        setProjects([]);
        setFollowers([]);
        setFollowing([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load(authToken);

    return () => {
      isMounted = false;
    };
  }, [loadSocialLists, token, updateUser]);

  const displayUser = useMemo(() => profile ?? user, [profile, user]);

  const avatarUrl = useMemo(() => resolveMediaUrl(displayUser?.avatar), [displayUser?.avatar]);
  const displayName = (displayUser?.name && `${displayUser.name}`.trim()) || "New builder";
  const username = (displayUser?.username && `${displayUser.username}`.trim()) || "username";
  const email = (displayUser?.email && `${displayUser.email}`.trim()) || "you@workyard.dev";
  const bio = (displayUser?.bio && `${displayUser.bio}`.trim()) || "Add a short bio so collaborators know what you are building.";
  const location = (displayUser?.location && `${displayUser.location}`.trim()) || "Somewhere on Earth";
  const experienceLevel = (displayUser?.experienceLevel && `${displayUser.experienceLevel}`.trim()) || "Contributor";
  const skillList = Array.isArray(displayUser?.skills) ? displayUser?.skills.filter(Boolean).slice(0, 12) : [];
  const currentUserId = displayUser?.id;
  const followerCount =
    typeof displayUser?.followersCount === "number"
      ? displayUser.followersCount
      : Array.isArray(displayUser?.followers)
        ? displayUser.followers.length
        : 0;
  const followingCount =
    typeof displayUser?.followingCount === "number"
      ? displayUser.followingCount
      : Array.isArray(displayUser?.following)
        ? displayUser.following.length
        : 0;
  const savedCount = Array.isArray(displayUser?.savedProjects) ? displayUser.savedProjects.length : 0;
  const projectCount = projects.length || (Array.isArray(displayUser?.projects) ? displayUser.projects.length : 0);

  const joinedLabel = useMemo(() => {
    if (!displayUser?.createdAt) {
      return "Joined recently";
    }
    try {
      return `Joined ${new Date(displayUser.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
      })}`;
    } catch (err) {
      return "Joined recently";
    }
  }, [displayUser?.createdAt]);

  const lastActiveLabel = useMemo(() => {
    if (!displayUser?.lastLogin && !displayUser?.updatedAt) {
      return "Active now";
    }
    const sourceDate = displayUser.lastLogin || displayUser.updatedAt;
    try {
      const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
      const now = Date.now();
      const parsed = new Date(sourceDate as string).getTime();
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
  }, [displayUser?.lastLogin, displayUser?.updatedAt]);

  if (loading) {
    return (
      <main className="page-shell">
        <div className="profile-state">Loading your profile…</div>
      </main>
    );
  }

  if (!token || !displayUser) {
    return (
      <main className="page-shell">
        <div className="profile-state">We could not find your profile. Please sign in again.</div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="page-kicker">Profile</p>
        <h1>{displayName}</h1>
        <p className="page-subtitle">Show collaborators who you are and what you are shipping.</p>
      </header>

      {error ? <div className="page-card profile-error">{error}</div> : null}

      <section className="profile-page">
        <article className="page-card profile-card">
          <div className="profile-card__avatar" aria-hidden={!avatarUrl}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={`${displayName} avatar`} loading="lazy" />
            ) : (
              <span>{initialsFromName(displayName) || username.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="profile-card__body">
            <div className="profile-card__primary">
              <div>
                <h2>{displayName}</h2>
                <p className="profile-card__handle">@{username}</p>
              </div>
              <button type="button" className="page-button secondary" onClick={logout}>
                Log out
              </button>
            </div>
            <div className="profile-card__meta">
              <span>{location}</span>
              <span>{experienceLevel}</span>
              <span>{joinedLabel}</span>
              <span>{lastActiveLabel}</span>
            </div>
            <p className="profile-card__bio">{bio}</p>
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
              <li>
                <span>Email</span>
                <a href={`mailto:${email}`}>{email}</a>
              </li>
              {displayUser?.github ? (
                <li>
                  <span>GitHub</span>
                  <a href={displayUser.github} target="_blank" rel="noreferrer">
                    {displayUser.github}
                  </a>
                </li>
              ) : null}
              {displayUser?.linkedin ? (
                <li>
                  <span>LinkedIn</span>
                  <a href={displayUser.linkedin} target="_blank" rel="noreferrer">
                    {displayUser.linkedin}
                  </a>
                </li>
              ) : null}
              {displayUser?.portfolio ? (
                <li>
                  <span>Portfolio</span>
                  <a href={displayUser.portfolio} target="_blank" rel="noreferrer">
                    {displayUser.portfolio}
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
              <p className="profile-empty">Add your skills so teams can find you for the next build.</p>
            )}
          </section>

          <section>
            <h3>Followers</h3>
            {loadingSocial ? (
              <p className="profile-empty">Loading followers…</p>
            ) : followers.length ? (
              <ul className="profile-follow-list" aria-label="Followers">
                {followers.slice(0, 10).map((person, index) => {
                  const personId = person.id ?? person.username ?? `anon-follower-${index}`;
                  const avatar = resolveMediaUrl(person.avatar);
                  const heading = person.name || person.username || "Builder";
                  const pending = isPending(person.id);
                  return (
                    <li key={`follower-${personId}`} className="profile-follow-list__item">
                      <div className="profile-follow-list__avatar" aria-hidden>
                        {avatar ? (
                          <img src={avatar} alt="" loading="lazy" />
                        ) : (
                          <span>{initialsFromName(heading) || "?"}</span>
                        )}
                      </div>
                      <div className="profile-follow-list__body">
                        <strong>{heading}</strong>
                        <span>@{person.username || "unknown"}</span>
                        {person.bio ? <p>{person.bio}</p> : null}
                      </div>
                      {person.id && currentUserId && person.id !== currentUserId ? (
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
                  const personId = person.id ?? person.username ?? `anon-following-${index}`;
                  const avatar = resolveMediaUrl(person.avatar);
                  const heading = person.name || person.username || "Builder";
                  const pending = isPending(person.id);
                  return (
                    <li key={`following-${personId}`} className="profile-follow-list__item">
                      <div className="profile-follow-list__avatar" aria-hidden>
                        {avatar ? (
                          <img src={avatar} alt="" loading="lazy" />
                        ) : (
                          <span>{initialsFromName(heading) || "?"}</span>
                        )}
                      </div>
                      <div className="profile-follow-list__body">
                        <strong>{heading}</strong>
                        <span>@{person.username || "unknown"}</span>
                        {person.bio ? <p>{person.bio}</p> : null}
                      </div>
                      {person.id && currentUserId && person.id !== currentUserId ? (
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
              <p className="profile-empty">You are not following anyone yet.</p>
            )}
          </section>
        </article>

        <article className="page-card profile-projects">
          <div className="profile-projects__header">
            <h3>Projects</h3>
            <p>Things you are building right now.</p>
          </div>
          {projects.length ? (
            <div className="profile-projects__grid">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="profile-empty">No projects yet. Share your first build with the crew.</div>
          )}
        </article>
      </section>
    </main>
  );
}
